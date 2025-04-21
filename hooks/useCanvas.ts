import { HANDLE_TOUCH_AREA } from '@/components/SelectionOverlay'; // Added HANDLE_SIZE
import { CanvasElements } from '@/constants/CanvasElement';
import {
  Selection,
  calculateCombinedBoundingBox,
  calculateElementBoundingBox,
  findElementsInSelection,
} from '@/utils/selectionUtils';
import { cloneDeep } from 'lodash';
import { useCallback, useRef, useState } from 'react';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { Tools } from '../constants/Tools';
import toolHandlers from './tool-handlers';
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

  const [selection, setSelection] = useState<Selection | null>(null);
  const selectionStateRef = useRef<SelectionState>(null);
  const initialPointRef = useRef<{ x: number; y: number } | null>(null);
  const initialSelectionRef = useRef<Selection | null>(null);
  const initialCanvasElementsRef = useRef<CanvasElement[]>([]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    selectionStateRef.current = null;
    initialPointRef.current = null;
    initialSelectionRef.current = null;
    initialCanvasElementsRef.current = [];
    scalingHandleIndexRef.current = null;
    scalingOriginRef.current = null;
  }, []);
  const { addToHistory, undo, redo } = useCanvasHistory(
    setElements,
    clearSelection
  ); // Removed history, currentHistoryIndex

  const scalingHandleIndexRef = useRef<number | null>(null);
  const scalingOriginRef = useRef<{ x: number; y: number } | null>(null);

  const generateId = () => uuidv4();

  const onStartInput = useCallback(
    (x: number, y: number) => {
      initialPointRef.current = { x, y };

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
          selectionStateRef.current = 'moving';
          initialSelectionRef.current = cloneDeep(selection);
          initialCanvasElementsRef.current = cloneDeep(
            elements.filter(el => selection.ids.includes(el.id))
          );
          return;
        } else {
          clearSelection();
        }
      }

      if (tool === Tools.SELECT) {
        setSelection({
          ids: [],
          x,
          y,
          width: 0,
          height: 0,
          selected: false,
        });
        selectionStateRef.current = 'selecting';
        return;
      }

      if (selectionStateRef.current !== 'selected') {
        clearSelection();
      }

      if (toolHandlers[tool] && toolHandlers[tool].initElement) {
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
    [tool, strokeWidth, color, generateId, selection, elements, clearSelection]
  );

  const onMoveInput = useCallback(
    (x: number, y: number) => {
      if (selection && selectionStateRef.current) {
        if (selectionStateRef.current === 'selecting') {
          setSelection(prev => {
            if (!prev || !initialPointRef.current) return null;
            return {
              ...prev,
              width: x - initialPointRef.current.x,
              height: y - initialPointRef.current.y,
            };
          });
        } else if (selectionStateRef.current === 'moving') {
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
              if (handler?.moveElement) {
                return handler.moveElement(initialElement, deltaX, deltaY);
              }
              return initialElement;
            }
          );

          setElements(prevElements =>
            prevElements.map(el => {
              const movedVersion = movedElements.find(
                movedEl => movedEl.id === el.id
              );
              return movedVersion || el;
            })
          );
        } else if (selectionStateRef.current === 'scaling') {
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
            scaleX = Math.sign(scaleX) * MIN_SCALE;
          if (Math.abs(scaleY) < MIN_SCALE)
            scaleY = Math.sign(scaleY) * MIN_SCALE;

          const scaledElements = initialCanvasElementsRef.current.map(
            initialElement => {
              const handler = toolHandlers[initialElement.tool];
              if (handler?.scaleElement) {
                return handler.scaleElement(
                  initialElement,
                  scaleX,
                  scaleY,
                  origin
                );
              }
              return initialElement;
            }
          );

          setElements(prevElements =>
            prevElements.map(el => {
              const scaledVersion = scaledElements.find(
                scaledEl => scaledEl.id === el.id
              );
              return scaledVersion || el;
            })
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
        }
      } else if (
        currentElement &&
        toolHandlers[tool] &&
        toolHandlers[tool].updateElement
      ) {
        const updatedElement = toolHandlers[tool].updateElement(
          currentElement,
          x,
          y
        );
        setCurrentElement(updatedElement);
      }
    },
    [currentElement, tool, selection, elements, fontManager]
  );

  const onEndInput = useCallback(
    (x: number, y: number) => {
      if (selection && selectionStateRef.current) {
        if (selectionStateRef.current === 'moving') {
          if (
            !initialPointRef.current ||
            !initialCanvasElementsRef.current ||
            !initialSelectionRef.current
          )
            return;

          const finalElements = elements.filter(el =>
            initialSelectionRef.current!.ids.includes(el.id)
          );

          if (
            initialCanvasElementsRef.current.length > 0 &&
            finalElements.length > 0 &&
            JSON.stringify(initialCanvasElementsRef.current) !==
              JSON.stringify(finalElements)
          ) {
            const action: HistoryAction = {
              type: 'MODIFY_ELEMENT',
              elementIds: initialSelectionRef.current.ids,
              originalElements: initialCanvasElementsRef.current,
              newElements: finalElements,
            };
            addToHistory(action);
          }

          selectionStateRef.current = 'selected';
          initialPointRef.current = null;
          initialSelectionRef.current = null;
          initialCanvasElementsRef.current = [];
          return;
        } else if (selectionStateRef.current === 'scaling') {
          if (!initialCanvasElementsRef.current || !initialSelectionRef.current)
            return;

          const finalElements = elements.filter(el =>
            initialSelectionRef.current!.ids.includes(el.id)
          );

          if (
            initialCanvasElementsRef.current.length > 0 &&
            finalElements.length > 0 &&
            JSON.stringify(initialCanvasElementsRef.current) !==
              JSON.stringify(finalElements)
          ) {
            const action: HistoryAction = {
              type: 'MODIFY_ELEMENT',
              elementIds: initialSelectionRef.current.ids,
              originalElements: initialCanvasElementsRef.current,
              newElements: finalElements,
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
        } else if (selectionStateRef.current === 'selecting') {
          const finalSelection = calculateSelectionBounds(
            selection,
            elements,
            fontManager
          );
          setSelection(finalSelection);
          selectionStateRef.current = finalSelection ? 'selected' : null;
          initialPointRef.current = null;
          return;
        }
      }

      if (currentElement) {
        const action: HistoryAction = {
          type: 'ADD_ELEMENT',
          elements: [currentElement],
        };

        setElements(prev => [...prev, currentElement]);
        addToHistory(action);
        setCurrentElement(null);
      }
      initialPointRef.current = null;
    },
    [currentElement, tool, elements, selection, addToHistory, fontManager]
  );

  const addExternalElement = useCallback(
    (element: CanvasElements.Any, tool: Tools, propagateToHistory = true) => {
      const newElementData: CanvasElement = {
        id: generateId(),
        element,
        tool,
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
            newElementData = {
              ...el,
              element: { ...el.element, ...updates },
            };
            return newElementData;
          }
          return el;
        })
      );

      if (
        selection &&
        selection.ids.length === 1 &&
        selection.ids[0] === id &&
        newElementData
      ) {
        const newBoundingBox = calculateElementBoundingBox(
          newElementData,
          10,
          fontManager
        );
        if (newBoundingBox) {
          setSelection({
            ...selection,
            ...newBoundingBox,
          });
        } else {
          clearSelection();
        }
      } else if (selection && selection.ids.includes(id)) {
        const selectedElements = elements.filter(el =>
          selection.ids.includes(el.id)
        );
        const updatedSelectedElements = selectedElements.map(el =>
          el.id === id && newElementData ? newElementData : el
        );
        const newCombinedBox = calculateCombinedBoundingBox(
          updatedSelectedElements,
          10,
          fontManager
        );
        if (newCombinedBox) {
          setSelection({
            ...selection,
            ...newCombinedBox,
          });
        } else {
          clearSelection();
        }
      }

      if (propagateToHistory && originalElement && newElementData) {
        const action: HistoryAction = {
          type: 'MODIFY_ELEMENT',
          elementIds: [id],
          originalElements: [originalElement],
          newElements: [newElementData],
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

  const deleteSelection = useCallback(() => {
    if (selection) {
      const elementsToDelete = elements.filter(element =>
        selection?.ids.includes(element.id)
      );

      const action: HistoryAction = {
        type: 'DELETE_ELEMENT',
        elements: [...elementsToDelete],
      };

      addToHistory(action);
      const newElements = elements.filter(
        element => !selection?.ids.includes(element.id)
      );
      setElements(newElements);
      clearSelection();
    }
  }, [selection, elements, addToHistory, clearSelection]);

  const clear = useCallback(() => {
    if (elements.length > 0) {
      const action: HistoryAction = {
        type: 'DELETE_ELEMENT',
        elements: [...elements],
      };

      addToHistory(action);
    }

    setElements([]);
    setCurrentElement(null);
    clearSelection();
  }, [elements, addToHistory, clearSelection]);

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
  };
};

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

  return {
    ids: selectedIds,
    ...combinedBox,
    selected: true,
  };
}
