import { HANDLE_TOUCH_AREA } from '@/components/SelectionOverlay';
import { CanvasElements } from '@/constants/CanvasElement';
import {
  calculateStarVertices,
  distanceSqFromPointToSegment,
  getPointsOnSmoothedPathQuadratic,
  isPointNearPolygonOutline,
  isPointNearPolyline,
} from '@/utils/geometryUtils';
import {
  Selection,
  calculateCombinedBoundingBox,
  calculateElementBoundingBox,
  findElementsInSelection,
  isPointInsideBox,
} from '@/utils/selectionUtils';
import { cloneDeep } from 'lodash';
import { useCallback, useRef, useState } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Tools } from '../constants/Tools';
import toolHandlers from './tool-handlers';
// Import the action types and the hook itself
import { HistoryAction, useCanvasHistory } from './useCanvasHistory';

export type CanvasElement = {
  id: string;
  element: CanvasElements.Any;
  tool: Tools;
};

export type CanvasProps = {
  tool: Tools;
  strokeWidth: number;
  color: string;
  fontManager?: any;
};

type SelectionState = 'selecting' | 'moving' | 'selected' | 'scaling' | null;

export const useCanvas = ({
  tool,
  strokeWidth,
  color,
  fontManager,
}: CanvasProps) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(
    null
  );
  // --- Eraser Refs ---
  const elementsToEraseRef = useRef<Set<string>>(new Set());
  // Stores the full element state *before* the erase operation started
  const originalElementsBeforeEraseRef = useRef<CanvasElement[] | null>(null);

  // --- Selection and Interaction Refs ---
  const [selection, setSelection] = useState<Selection | null>(null);
  const selectionStateRef = useRef<SelectionState>(null);
  const initialPointRef = useRef<{ x: number; y: number } | null>(null);
  const initialSelectionRef = useRef<Selection | null>(null);
  const initialCanvasElementsRef = useRef<CanvasElement[]>([]); // For move/scale original state
  const scalingHandleIndexRef = useRef<number | null>(null);
  const scalingOriginRef = useRef<{ x: number; y: number } | null>(null);

  // --- Utility Functions ---
  const generateId = () => uuidv4();

  // Define clearSelection *before* passing it to useCanvasHistory
  const clearSelection = useCallback(() => {
    setSelection(null);
    selectionStateRef.current = null;
    initialPointRef.current = null;
    initialSelectionRef.current = null;
    initialCanvasElementsRef.current = [];
    scalingHandleIndexRef.current = null;
    scalingOriginRef.current = null;
  }, []);

  // --- History Hook ---
  // Pass setElements and clearSelection to the history hook
  const { addToHistory, undo, redo } = useCanvasHistory(
    setElements,
    clearSelection
  );

  // --- Hit Detection ---
  const findElementAtPoint = useCallback(
    (
      x: number,
      y: number,
      elementsToCheck: CanvasElement[],
      fm?: any
    ): string | null => {
      const point = { x, y };
      // Start with a moderate tolerance, adjust if needed after confirming base functionality

      for (let i = elementsToCheck.length - 1; i >= 0; i--) {
        const element = elementsToCheck[i];
        if (!element) continue;

        const elementData = element.element;
        const elementTool = element.tool;
        const elementStrokeWidth = (elementData as any).strokeWidth;
        const actualElementStrokeWidth =
          elementStrokeWidth === undefined || elementStrokeWidth === null
            ? 3
            : elementStrokeWidth;

        const touchTolerance = tool === Tools.ERASER ? 0 : 1;
        const eraserRadius = tool === Tools.ERASER ? strokeWidth / 2 : 0;

        // Calculate Single Effective Radius - important to match visual size
        const effectiveCheckRadius =
          actualElementStrokeWidth / 2 + eraserRadius;
        const effectiveCheckRadiusSq = effectiveCheckRadius ** 2;

        // --- DEBUG LOG (Optional) ---
        // if (tool === Tools.ERASER && [Tools.RECTANGLE, Tools.TRIANGLE, Tools.STAR, Tools.PEN, Tools.HIGHLIGHTER, Tools.LINE, Tools.CIRCLE].includes(elementTool)) {
        //   console.log(`[findElementAtPoint] Element ${element.id} (${elementTool}):`);
        //   console.log(`  EraserRadius=${eraserRadius.toFixed(2)}, ElemStroke=${actualElementStrokeWidth.toFixed(2)}, TouchTol=${touchTolerance}`);
        //   console.log(`  => effectiveCheckRadius=${effectiveCheckRadius.toFixed(2)} (Sq=${effectiveCheckRadiusSq.toFixed(2)})`);
        // }
        // --- END DEBUG LOG ---

        // Broad phase check
        const bboxPadding =
          tool === Tools.ERASER ? effectiveCheckRadius : effectiveCheckRadius;
        const bbox = calculateElementBoundingBox(element, bboxPadding, fm);
        if (!bbox || !isPointInsideBox(point, bbox)) {
          continue;
        }

        // Precise phase: Use the single effectiveCheckRadius or its square
        switch (elementTool) {
          // Around line 126-139

          case Tools.PEN:
          case Tools.HIGHLIGHTER: {
            const pathData = elementData as CanvasElements.Path;
            if (!pathData?.points || pathData.points.length < 1) break;

            // Calculate a more precise radius specifically for pen/highlighter
            // Remove the extra tolerance by reducing the effective radius
            const penPrecisionFactor = tool === Tools.ERASER ? 0.75 : 1.0;
            const penCheckRadius = effectiveCheckRadius * penPrecisionFactor;

            const smoothedPoints = getPointsOnSmoothedPathQuadratic(
              pathData.points,
              10
            );
            // Use the reduced radius for more precise detection
            if (isPointNearPolyline(point, smoothedPoints, penCheckRadius)) {
              return element.id;
            }
            break;
          }
          case Tools.CIRCLE: {
            const circleData = elementData as CanvasElements.Circle;
            if (!circleData?.center) break;
            const radius = circleData.radius;
            const dx = x - circleData.center.x;
            const dy = y - circleData.center.y;
            const distSq = dx * dx + dy * dy;
            // Use the single effective radius
            const outerEffectiveRadiusSq = (radius + effectiveCheckRadius) ** 2;
            const innerEffectiveRadiusSq =
              Math.max(0, radius - effectiveCheckRadius) ** 2;
            if (
              distSq <= outerEffectiveRadiusSq &&
              distSq >= innerEffectiveRadiusSq
            ) {
              return element.id;
            }
            break;
          }
          case Tools.LINE: {
            const lineData = elementData as CanvasElements.Line;
            if (!lineData?.startPoint || !lineData?.endPoint) break;
            const lineDistSq = distanceSqFromPointToSegment(
              x,
              y,
              lineData.startPoint.x,
              lineData.startPoint.y,
              lineData.endPoint.x,
              lineData.endPoint.y
            );
            // Use the single effective radius squared
            if (lineDistSq <= effectiveCheckRadiusSq) {
              return element.id;
            }
            break;
          }
          case Tools.RECTANGLE:
          case Tools.TRIANGLE:
          case Tools.STAR: {
            let vertices: Array<{ x: number; y: number }> = [];

            if (elementTool === Tools.RECTANGLE) {
              const rectData = elementData as CanvasElements.Rectangle;
              if (rectData?.point) {
                const x = rectData.point.x;
                const y = rectData.point.y;
                const w = rectData.width;
                const h = rectData.height;

                // Rectangle corners
                vertices = [
                  { x, y }, // top-left
                  { x: x + w, y }, // top-right
                  { x: x + w, y: y + h }, // bottom-right
                  { x, y: y + h }, // bottom-left
                ];
              }
            } else if (elementTool === Tools.TRIANGLE) {
              const triData = elementData as CanvasElements.Triangle;
              if (triData?.point1 && triData?.point2 && triData?.point3) {
                // Use the three points of the triangle
                vertices = [triData.point1, triData.point2, triData.point3];
              }
            } else if (elementTool === Tools.STAR) {
              const starData = elementData as CanvasElements.Star;
              if (starData?.point && starData?.radius && starData?.spikes) {
                // Calculate star vertices using the existing utility function
                vertices = calculateStarVertices(
                  starData.point,
                  starData.radius,
                  0.5, // innerRadiusRatio (default)
                  starData.spikes
                );
              }
            }

            // Only test if we have vertices
            if (
              vertices.length > 0 &&
              isPointNearPolygonOutline(point, vertices, effectiveCheckRadius)
            ) {
              return element.id;
            }
            break;
          }
          case Tools.IMAGE:
          case Tools.TEXT:
            return element.id;
        }
      }
      return null;
    },
    [tool, strokeWidth, fontManager]
  );

  // --- Input Handlers ---

  const onStartInput = useCallback(
    (x: number, y: number) => {
      initialPointRef.current = { x, y };

      // --- Eraser Start ---
      if (tool === Tools.ERASER) {
        elementsToEraseRef.current.clear();
        // Store the complete state *before* erasing starts (we'll keep this for reference)
        originalElementsBeforeEraseRef.current = cloneDeep(elements);

        // Check for initial touch intersection
        const touchedElementId = findElementAtPoint(
          x,
          y,
          elements,
          fontManager
        );
        if (touchedElementId) {
          // Find the original element before erasing it
          const elementToErase = elements.find(
            el => el.id === touchedElementId
          );
          if (elementToErase) {
            // Create a history action for this specific element
            const action: HistoryAction = {
              type: 'DELETE_ELEMENT',
              elements: [cloneDeep(elementToErase)],
            };
            addToHistory(action);
          }

          // Immediately remove the element visually
          setElements(prev => prev.filter(el => el.id !== touchedElementId));
          // Track the ID of the erased element
          elementsToEraseRef.current.add(touchedElementId);
        }
        return;
      }

      // --- Selection Interaction Start ---
      if (selection && selectionStateRef.current === 'selected') {
        const { x: selX, y: selY, width: selW, height: selH } = selection;
        const normX = selW < 0 ? selX + selW : selX;
        const normY = selH < 0 ? selY + selH : selY;
        const normW = Math.abs(selW);
        const normH = Math.abs(selH);
        const halfW = normW / 2;
        const halfH = normH / 2;
        const handles = [
          { x: normX, y: normY },
          { x: normX + halfW, y: normY },
          { x: normX + normW, y: normY },
          { x: normX + normW, y: normY + halfH },
          { x: normX + normW, y: normY + normH },
          { x: normX + halfW, y: normY + normH },
          { x: normX, y: normY + normH },
          { x: normX, y: normY + halfH },
        ];
        const touchRadiusSq = (HANDLE_TOUCH_AREA / 2) ** 2;
        let touchedHandleIndex: number | null = null;
        for (let i = 0; i < handles.length; i++) {
          const dx = x - handles[i].x;
          const dy = y - handles[i].y;
          if (dx * dx + dy * dy < touchRadiusSq) {
            touchedHandleIndex = i;
            break;
          }
        }

        if (touchedHandleIndex !== null) {
          // Start Scaling
          selectionStateRef.current = 'scaling';
          scalingHandleIndexRef.current = touchedHandleIndex;
          const oppositeHandleIndex = (touchedHandleIndex + 4) % 8;
          scalingOriginRef.current = handles[oppositeHandleIndex];
          initialSelectionRef.current = cloneDeep(selection);
          initialCanvasElementsRef.current = cloneDeep(
            elements.filter(el => selection.ids.includes(el.id))
          );
          return;
        }

        if (
          x >= normX &&
          x <= normX + normW &&
          y >= normY &&
          y <= normY + normH
        ) {
          // Start Moving
          selectionStateRef.current = 'moving';
          initialSelectionRef.current = cloneDeep(selection);
          initialCanvasElementsRef.current = cloneDeep(
            elements.filter(el => selection.ids.includes(el.id))
          );
          return;
        } else {
          clearSelection(); // Clicked outside
        }
      }

      // --- Select Tool Start ---
      if (tool === Tools.SELECT) {
        setSelection({ ids: [], x, y, width: 0, height: 0, selected: false });
        selectionStateRef.current = 'selecting';
        return;
      }

      // --- Drawing Tool Start ---
      if (selectionStateRef.current !== 'selected') {
        // Clear selection if not interacting with it
        clearSelection();
      }
      if (toolHandlers[tool]?.initElement) {
        const newElement = toolHandlers[tool].initElement(
          x,
          y,
          strokeWidth,
          color,
          generateId
        );
        setCurrentElement(newElement);
      }
    },
    [
      tool,
      strokeWidth,
      color,
      generateId,
      selection,
      elements,
      clearSelection,
      findElementAtPoint,
      fontManager,
    ]
  );

  const onMoveInput = useCallback(
    (x: number, y: number) => {
      // --- Eraser Move ---
      if (tool === Tools.ERASER) {
        const touchedElementId = findElementAtPoint(
          x,
          y,
          elements,
          fontManager
        );
        if (
          touchedElementId &&
          !elementsToEraseRef.current.has(touchedElementId)
        ) {
          // Find the original element before erasing it
          const elementToErase = elements.find(
            el => el.id === touchedElementId
          );
          if (elementToErase) {
            // Create a history action for this specific element
            const action: HistoryAction = {
              type: 'DELETE_ELEMENT',
              elements: [cloneDeep(elementToErase)],
            };
            addToHistory(action);
          }

          elementsToEraseRef.current.add(touchedElementId);
          setElements(prev => prev.filter(el => el.id !== touchedElementId));
          if (selection?.ids.includes(touchedElementId)) {
            clearSelection(); // Clear selection if erased element was selected
          }
        }
        return;
      }

      // --- Selection Interaction Move ---
      if (selection && selectionStateRef.current) {
        // --- Selecting Move ---
        if (selectionStateRef.current === 'selecting') {
          setSelection(prev => {
            if (!prev || !initialPointRef.current) return null;
            return {
              ...prev,
              width: x - initialPointRef.current.x,
              height: y - initialPointRef.current.y,
            };
          });
          return;
        }
        // --- Moving Move ---
        else if (selectionStateRef.current === 'moving') {
          if (
            !initialPointRef.current ||
            !initialSelectionRef.current ||
            !initialCanvasElementsRef.current
          )
            return;
          const deltaX = x - initialPointRef.current.x;
          const deltaY = y - initialPointRef.current.y;
          setSelection({
            ...initialSelectionRef.current,
            x: initialSelectionRef.current.x + deltaX,
            y: initialSelectionRef.current.y + deltaY,
          });
          const movedElements = initialCanvasElementsRef.current.map(
            initialElement => {
              const handler = toolHandlers[initialElement.tool];
              return handler?.moveElement
                ? handler.moveElement(initialElement, deltaX, deltaY)
                : initialElement;
            }
          );
          setElements(prevElements =>
            prevElements.map(
              el => movedElements.find(movedEl => movedEl.id === el.id) || el
            )
          );
          return;
        }
        // --- Scaling Move ---
        else if (selectionStateRef.current === 'scaling') {
          if (
            !initialPointRef.current ||
            !initialSelectionRef.current ||
            !initialCanvasElementsRef.current ||
            scalingHandleIndexRef.current === null ||
            !scalingOriginRef.current
          )
            return;
          const origin = scalingOriginRef.current;
          const handleIndex = scalingHandleIndexRef.current;
          const {
            x: iSelX,
            y: iSelY,
            width: iSelW,
            height: iSelH,
          } = initialSelectionRef.current;
          const iNormX = iSelW < 0 ? iSelX + iSelW : iSelX;
          const iNormY = iSelH < 0 ? iSelY + iSelH : iSelY;
          const iNormW = Math.abs(iSelW);
          const iNormH = Math.abs(iSelH);
          const iHalfW = iNormW / 2;
          const iHalfH = iNormH / 2;
          const iHandles = [
            { x: iNormX, y: iNormY },
            { x: iNormX + iHalfW, y: iNormY },
            { x: iNormX + iNormW, y: iNormY },
            { x: iNormX + iNormW, y: iNormY + iHalfH },
            { x: iNormX + iNormW, y: iNormY + iNormH },
            { x: iNormX + iHalfW, y: iNormY + iNormH },
            { x: iNormX, y: iNormY + iNormH },
            { x: iNormX, y: iNormY + iHalfH },
          ];
          const initialHandlePos = iHandles[handleIndex];
          const initialDeltaX = initialHandlePos.x - origin.x;
          const initialDeltaY = initialHandlePos.y - origin.y;
          const currentDeltaX = x - origin.x;
          const currentDeltaY = y - origin.y;
          let scaleX = initialDeltaX === 0 ? 1 : currentDeltaX / initialDeltaX;
          let scaleY = initialDeltaY === 0 ? 1 : currentDeltaY / initialDeltaY;
          if ([1, 5].includes(handleIndex)) scaleX = 1;
          if ([3, 7].includes(handleIndex)) scaleY = 1;
          const MIN_SCALE = 0.01;
          if (Math.abs(scaleX) < MIN_SCALE)
            scaleX = Math.sign(scaleX || 1) * MIN_SCALE;
          if (Math.abs(scaleY) < MIN_SCALE)
            scaleY = Math.sign(scaleY || 1) * MIN_SCALE;
          const scaledElements = initialCanvasElementsRef.current.map(
            initialElement => {
              const handler = toolHandlers[initialElement.tool];
              return handler?.scaleElement
                ? handler.scaleElement(initialElement, scaleX, scaleY, origin)
                : initialElement;
            }
          );
          setElements(prevElements =>
            prevElements.map(
              el => scaledElements.find(scaledEl => scaledEl.id === el.id) || el
            )
          );
          const newCombinedBox = calculateCombinedBoundingBox(
            scaledElements,
            10,
            fontManager
          );
          if (newCombinedBox) {
            setSelection({
              ...initialSelectionRef.current,
              ...newCombinedBox,
              selected: true,
            });
          }
          return;
        }
      }

      // --- Drawing Tool Move ---
      if (currentElement && toolHandlers[tool]?.updateElement) {
        const updatedElement = toolHandlers[tool].updateElement(
          currentElement,
          x,
          y
        );
        setCurrentElement(updatedElement);
      }
    },
    [
      currentElement,
      tool,
      selection,
      elements,
      clearSelection,
      fontManager,
      findElementAtPoint,
    ]
  );

  const onEndInput = useCallback(
    (x: number, y: number) => {
      if (tool === Tools.ERASER) {
        elementsToEraseRef.current.clear();
        originalElementsBeforeEraseRef.current = null;
        initialPointRef.current = null;
        return; // Eraser action finished
      }

      // --- Selection Interaction End ---
      if (selection && selectionStateRef.current) {
        // --- Moving End ---
        if (selectionStateRef.current === 'moving') {
          if (
            !initialPointRef.current ||
            !initialCanvasElementsRef.current ||
            !initialSelectionRef.current
          ) {
            selectionStateRef.current = selection.selected ? 'selected' : null;
            return;
          }
          const finalElements = elements.filter(el =>
            initialSelectionRef.current!.ids.includes(el.id)
          );
          // Add history only if elements actually changed
          if (
            initialCanvasElementsRef.current.length > 0 &&
            finalElements.length > 0 &&
            JSON.stringify(initialCanvasElementsRef.current) !==
              JSON.stringify(finalElements)
          ) {
            const action: HistoryAction = {
              type: 'MODIFY_ELEMENT',
              elementIds: initialSelectionRef.current.ids,
              originalElements: initialCanvasElementsRef.current, // Original state of moved elements
              newElements: finalElements, // Final state of moved elements
            };
            addToHistory(action);
          }
          selectionStateRef.current = 'selected';
          initialPointRef.current = null;
          initialSelectionRef.current = null;
          initialCanvasElementsRef.current = [];
          return;
        }
        // --- Scaling End ---
        else if (selectionStateRef.current === 'scaling') {
          if (
            !initialCanvasElementsRef.current ||
            !initialSelectionRef.current
          ) {
            selectionStateRef.current = selection.selected ? 'selected' : null;
            return;
          }
          const finalElements = elements.filter(el =>
            initialSelectionRef.current!.ids.includes(el.id)
          );
          // Add history only if elements actually changed
          if (
            initialCanvasElementsRef.current.length > 0 &&
            finalElements.length > 0 &&
            JSON.stringify(initialCanvasElementsRef.current) !==
              JSON.stringify(finalElements)
          ) {
            const action: HistoryAction = {
              type: 'MODIFY_ELEMENT',
              elementIds: initialSelectionRef.current.ids,
              originalElements: initialCanvasElementsRef.current, // Original state of scaled elements
              newElements: finalElements, // Final state of scaled elements
            };
            addToHistory(action);
          }
          selectionStateRef.current = 'selected';
          initialPointRef.current = null;
          initialSelectionRef.current = null;
          initialCanvasElementsRef.current = [];
          scalingHandleIndexRef.current = null;
          scalingOriginRef.current = null;
          return;
        }
        // --- Selecting End ---
        else if (selectionStateRef.current === 'selecting') {
          const finalSelection = calculateSelectionBounds(
            selection,
            elements,
            fontManager
          );
          setSelection(finalSelection);
          selectionStateRef.current = finalSelection ? 'selected' : null;
          initialPointRef.current = null;
          return; // No history action for selection itself
        }
      }

      // --- Drawing Tool End ---
      if (currentElement) {
        const handler = toolHandlers[tool];
        // Finalize element (e.g., remove redundant points) before adding
        const finalElement = handler?.finalizeElement
          ? handler.finalizeElement(currentElement)
          : currentElement;
        const isValid = finalElement !== null; // Check if finalizeElement returned null (invalid)

        if (isValid && finalElement) {
          // Check finalElement exists
          // Add the completed element to the main state
          setElements(prev => [...prev, finalElement]);
          // Add to history
          const action: HistoryAction = {
            type: 'ADD_ELEMENT',
            elements: [finalElement], // History only needs the added element
          };
          addToHistory(action);
        }
        setCurrentElement(null); // Clear the temporary drawing element
      }
      initialPointRef.current = null; // Reset initial point ref for all tools
    },
    [
      currentElement,
      tool,
      elements,
      selection,
      addToHistory,
      fontManager,
      clearSelection,
    ]
  );

  // --- External Element Modification Functions ---

  const addExternalElement = useCallback(
    (
      element: CanvasElements.Any,
      toolType: Tools,
      propagateToHistory = true
    ) => {
      const newElementData: CanvasElement = {
        id: generateId(),
        element,
        tool: toolType,
      };
      setElements(prev => [...prev, newElementData]);
      if (propagateToHistory) {
        const action: HistoryAction = {
          type: 'ADD_ELEMENT',
          elements: [newElementData],
        };
        addToHistory(action);
      }
    },
    [generateId, addToHistory]
  );

  const modifyElement = useCallback(
    (
      id: string,
      updates: Partial<CanvasElements.Any>,
      propagateToHistory = true
    ) => {
      let originalElement: CanvasElement | null = null;
      let newElementData: CanvasElement | null = null;

      setElements(prev =>
        prev.map(el => {
          if (el.id === id) {
            originalElement = cloneDeep(el);
            newElementData = { ...el, element: { ...el.element, ...updates } };
            return newElementData;
          }
          return el;
        })
      );

      if (selection && selection.ids.includes(id) && newElementData) {
        const selectedElements = elements.filter(el =>
          selection.ids.includes(el.id)
        );
        const updatedSelectedElements = selectedElements.map(el =>
          el.id === id ? newElementData! : el
        );
        const newCombinedBox = calculateCombinedBoundingBox(
          updatedSelectedElements,
          10,
          fontManager
        );
        if (newCombinedBox) {
          setSelection({ ...selection, ...newCombinedBox });
        } else {
          clearSelection();
        }
      }

      if (propagateToHistory && originalElement && newElementData) {
        const action: HistoryAction = {
          type: 'MODIFY_ELEMENT',
          elementIds: [id],
          originalElements: [originalElement], // Original state of the single modified element
          newElements: [newElementData], // Final state of the single modified element
        };
        addToHistory(action);
      }
    },
    [
      elements,
      addToHistory,
      selection,
      setSelection,
      fontManager,
      clearSelection,
    ]
  );
  function isPath(element: CanvasElements.Any): element is CanvasElements.Path {
    return (element as CanvasElements.Path).points !== undefined;
  }
  function isLine(element: CanvasElements.Any): element is CanvasElements.Line {
    return (
      (element as CanvasElements.Line).startPoint !== undefined &&
      (element as CanvasElements.Line).endPoint !== undefined
    );
  }

  function isRectangle(
    element: CanvasElements.Any
  ): element is CanvasElements.Rectangle {
    return (
      (element as CanvasElements.Rectangle).point !== undefined &&
      (element as CanvasElements.Rectangle).width !== undefined &&
      (element as CanvasElements.Rectangle).height !== undefined
    );
  }

  function isTriangle(
    element: CanvasElements.Any
  ): element is CanvasElements.Triangle {
    return (
      (element as CanvasElements.Triangle).point1 !== undefined &&
      (element as CanvasElements.Triangle).point2 !== undefined &&
      (element as CanvasElements.Triangle).point3 !== undefined
    );
  }

  function isCircle(
    element: CanvasElements.Any
  ): element is CanvasElements.Circle {
    return (
      (element as CanvasElements.Circle).center !== undefined &&
      (element as CanvasElements.Circle).radius !== undefined
    );
  }

  function isStar(element: CanvasElements.Any): element is CanvasElements.Star {
    return (
      (element as CanvasElements.Star).point !== undefined &&
      (element as CanvasElements.Star).radius !== undefined &&
      (element as CanvasElements.Star).spikes !== undefined
    );
  }

  function isText(element: CanvasElements.Any): element is CanvasElements.Text {
    return (
      (element as CanvasElements.Text).point !== undefined &&
      (element as CanvasElements.Text).text !== undefined &&
      (element as CanvasElements.Text).fontFamily !== undefined
    );
  }

  function isImage(
    element: CanvasElements.Any
  ): element is CanvasElements.Image {
    return (
      (element as CanvasElements.Image).point !== undefined &&
      (element as CanvasElements.Image).width !== undefined &&
      (element as CanvasElements.Image).height !== undefined &&
      (element as CanvasElements.Image).uri !== undefined
    );
  }
  const duplicateSelection = useCallback(() => {
    if (selection && selection.ids.length > 0) {
      const elementsToDupe = elements.filter(element =>
        selection.ids.includes(element.id)
      );
      if (elementsToDupe.length > 0) {
        const OFFSET = 40; // Offset for duplicated elements
        const newElements = elementsToDupe.map(element => {
          const newElement = cloneDeep(element);
          newElement.id = generateId(); // Generate a new ID for the duplicate

          // Check if the element is a Path and handle accordingly
          if (isPath(newElement.element)) {
            newElement.element.points = newElement.element.points.map(
              point => ({
                x: point.x + OFFSET,
                y: point.y + OFFSET,
              })
            );
          } else if (isLine(newElement.element)) {
            newElement.element.startPoint = {
              x: newElement.element.startPoint.x + OFFSET,
              y: newElement.element.startPoint.y + OFFSET,
            };
            newElement.element.endPoint = {
              x: newElement.element.endPoint.x + OFFSET,
              y: newElement.element.endPoint.y + OFFSET,
            };
          } else if (isRectangle(newElement.element)) {
            newElement.element.point = {
              x: newElement.element.point.x + OFFSET,
              y: newElement.element.point.y + OFFSET,
            };
          } else if (isTriangle(newElement.element)) {
            newElement.element.point1 = {
              x: newElement.element.point1.x + OFFSET,
              y: newElement.element.point1.y + OFFSET,
            };
            newElement.element.point2 = {
              x: newElement.element.point2.x + OFFSET,
              y: newElement.element.point2.y + OFFSET,
            };
            newElement.element.point3 = {
              x: newElement.element.point3.x + OFFSET,
              y: newElement.element.point3.y + OFFSET,
            };
          } else if (isCircle(newElement.element)) {
            newElement.element.center = {
              x: newElement.element.center.x + OFFSET,
              y: newElement.element.center.y + OFFSET,
            };
          } else if (isStar(newElement.element)) {
            newElement.element.point = {
              x: newElement.element.point.x + OFFSET,
              y: newElement.element.point.y + OFFSET,
            };
          } else if (isText(newElement.element)) {
            newElement.element.point = {
              x: newElement.element.point.x + OFFSET,
              y: newElement.element.point.y + OFFSET,
            };
          } else if (isImage(newElement.element)) {
            newElement.element.point = {
              x: newElement.element.point.x + OFFSET,
              y: newElement.element.point.y + OFFSET,
            };
          }
          return newElement;
        });
        const action: HistoryAction = {
          type: 'ADD_ELEMENT',
          elements: newElements,
        };
        addToHistory(action);
        setElements(prev => [...prev, ...newElements]);
        setSelection({
          ids: newElements.map(el => el.id),
          selected: true,
          x: selection.x + OFFSET,
          y: selection.y + OFFSET,
          width: selection.width,
          height: selection.height,
        });
      }
    }
  }, [selection, elements, addToHistory, generateId, fontManager]);

  const deleteSelection = useCallback(() => {
    if (selection && selection.ids.length > 0) {
      const elementsToDelete = elements.filter(element =>
        selection.ids.includes(element.id)
      );
      if (elementsToDelete.length > 0) {
        const action: HistoryAction = {
          type: 'DELETE_ELEMENT',
          elements: cloneDeep(elementsToDelete),
        };
        addToHistory(action);
        setElements(prev =>
          prev.filter(element => !selection.ids.includes(element.id))
        );
      }
      clearSelection();
    }
  }, [selection, elements, addToHistory, clearSelection]);

  const clear = useCallback(() => {
    if (elements.length > 0) {
      const action: HistoryAction = {
        type: 'DELETE_ELEMENT',
        elements: cloneDeep(elements),
      };
      addToHistory(action);
    }
    setElements([]);
    setCurrentElement(null);
    clearSelection();
  }, [elements, addToHistory, clearSelection]);

  // --- Return Values ---
  return {
    elements,
    currentElement,
    onStartInput,
    onMoveInput,
    onEndInput,
    undo,
    redo,
    clear,
    addExternalElement,
    modifyElement,
    selection,
    deleteSelection,
    duplicateSelection,
  };
};

// --- Helper Function (Outside Hook) ---
function calculateSelectionBounds(
  selection: Selection | null,
  elements: CanvasElement[],
  fontManager?: any
): Selection | null {
  if (!selection) return null;
  const MINIMUM_SELECTION_SIZE = 5;
  if (
    Math.abs(selection.width) < MINIMUM_SELECTION_SIZE &&
    Math.abs(selection.height) < MINIMUM_SELECTION_SIZE
  ) {
    return null;
  }
  const normalizedSelection = {
    ...selection,
    x: selection.width < 0 ? selection.x + selection.width : selection.x,
    y: selection.height < 0 ? selection.y + selection.height : selection.y,
    width: Math.abs(selection.width),
    height: Math.abs(selection.height),
  };
  const selectedElements = findElementsInSelection(
    elements,
    normalizedSelection,
    fontManager
  );
  if (selectedElements.length === 0) {
    return null;
  }
  const selectedIds = selectedElements.map(element => element.id);
  const combinedBox = calculateCombinedBoundingBox(
    selectedElements,
    10,
    fontManager
  );
  if (!combinedBox) {
    return null;
  }
  return { ids: selectedIds, ...combinedBox, selected: true };
}
