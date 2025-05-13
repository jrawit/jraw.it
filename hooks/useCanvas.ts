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
// Import the new eraser hit detection utility
import { eraserHitTest } from '@/utils/eraserHitDetection';

export type CanvasElement = {
  id: string;
  element: CanvasElements.Any;
  tool: Tools;
  rotation?: number; // Add rotation property to CanvasElement
};

export type CanvasProps = {
  tool: Tools;
  strokeWidth: number;
  color: string;
  isShiftDown: boolean;
  fontManager?: any;
};

type SelectionState =
  | 'selecting'
  | 'moving'
  | 'selected'
  | 'scaling'
  | 'rotating'
  | null;

export const useCanvas = ({
  tool,
  strokeWidth,
  color,
  fontManager,
  isShiftDown,
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
  // New refs for rotation
  const rotationHandleRef = useRef<boolean>(false);
  const rotationStartAngleRef = useRef<number>(0);
  const initialAngleRef = useRef<number>(0);

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
    rotationHandleRef.current = false;
    rotationStartAngleRef.current = 0;
    initialAngleRef.current = 0;
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

      // For eraser tool, use the specialized hit detection
      if (tool === Tools.ERASER) {
        for (let i = elementsToCheck.length - 1; i >= 0; i--) {
          const element = elementsToCheck[i];
          if (!element) continue;

          // Get eraser radius (half of stroke width)
          const eraserRadius = strokeWidth / 2;

          // Use the specialized eraser hit test
          if (eraserHitTest(point, element, eraserRadius)) {
            return element.id;
          }
        }
        return null;
      }

      // For other tools, use existing hit detection
      for (let i = elementsToCheck.length - 1; i >= 0; i--) {
        const element = elementsToCheck[i];
        if (!element) continue;

        const elementData = element.element;
        const elementTool = element.tool;
        const elementRotation = element.rotation || 0;
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

        // Handle triangles specially
        if (elementTool === Tools.TRIANGLE) {
          const triangleData = elementData as CanvasElements.Triangle;

          // Early exit if we don't have valid triangle data
          if (
            !triangleData?.point1 ||
            !triangleData?.point2 ||
            !triangleData?.point3
          )
            continue;

          // Get the original triangle vertices
          const vertices = [
            triangleData.point1,
            triangleData.point2,
            triangleData.point3,
          ];

          // Calculate the centroid (center point) of the triangle
          const centroidX =
            (triangleData.point1.x +
              triangleData.point2.x +
              triangleData.point3.x) /
            3;
          const centroidY =
            (triangleData.point1.y +
              triangleData.point2.y +
              triangleData.point3.y) /
            3;
          const centroid = { x: centroidX, y: centroidY };

          // Apply rotation to the vertices if needed
          const transformedVertices = elementRotation
            ? vertices.map(v => {
                // Translate to origin (relative to centroid)
                const dx = v.x - centroid.x;
                const dy = v.y - centroid.y;

                // Apply rotation
                const cos = Math.cos(elementRotation);
                const sin = Math.sin(elementRotation);
                const rotatedX = dx * cos - dy * sin;
                const rotatedY = dx * sin + dy * cos;

                // Translate back
                return {
                  x: rotatedX + centroid.x,
                  y: rotatedY + centroid.y,
                };
              })
            : vertices;

          // Check each edge of the triangle
          for (let j = 0; j < 3; j++) {
            const start = transformedVertices[j];
            const end = transformedVertices[(j + 1) % 3]; // Loop back to the first vertex

            // Calculate distance from point to this edge
            const edgeDistSq = distanceSqFromPointToSegment(
              x,
              y,
              start.x,
              start.y,
              end.x,
              end.y
            );

            // If the point is close enough to any edge, we have a hit
            if (edgeDistSq <= effectiveCheckRadiusSq) {
              return element.id;
            }
          }

          // No hit on any edge
          continue;
        }

        // Broad phase check
        const bboxPadding =
          tool === Tools.ERASER ? effectiveCheckRadius : effectiveCheckRadius;
        const bbox = calculateElementBoundingBox(element, bboxPadding, fm);
        if (!bbox || !isPointInsideBox(point, bbox)) {
          continue;
        }

        // Precise phase: Use the single effectiveCheckRadius or its square
        switch (elementTool) {
          case Tools.PEN:
          case Tools.HIGHLIGHTER: {
            const pathData = elementData as CanvasElements.Path;
            if (!pathData?.points || pathData.points.length < 1) break;

            // Calculate the center of the path for rotation
            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
            for (const pt of pathData.points) {
              minX = Math.min(minX, pt.x);
              minY = Math.min(minY, pt.y);
              maxX = Math.max(maxX, pt.x);
              maxY = Math.max(maxY, pt.y);
            }
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;

            // Transform all points according to their rotation
            const transformedPoints = pathData.points.map(pt => {
              if (!elementRotation) return pt;

              // Apply rotation transformation around center
              const dx = pt.x - centerX;
              const dy = pt.y - centerY;
              const cos = Math.cos(elementRotation);
              const sin = Math.sin(elementRotation);

              return {
                x: centerX + (dx * cos - dy * sin),
                y: centerY + (dx * sin + dy * cos),
              };
            });

            // Calculate a more precise radius specifically for pen/highlighter
            const penPrecisionFactor = tool === Tools.ERASER ? 0.75 : 1.0;
            const penCheckRadius = effectiveCheckRadius * penPrecisionFactor;

            const smoothedPoints = getPointsOnSmoothedPathQuadratic(
              transformedPoints,
              10
            );

            // Use the transformed points for detection
            if (isPointNearPolyline(point, smoothedPoints, penCheckRadius)) {
              return element.id;
            }
            break;
          }
          case Tools.CIRCLE: {
            const circleData = elementData as CanvasElements.Circle;
            if (!circleData?.center) break;

            // For rotated ellipses, we need a different approach
            if (elementRotation && circleData.radiusX !== circleData.radiusY) {
              // Transform the test point to the ellipse's coordinate system
              const centerX = circleData.center.x;
              const centerY = circleData.center.y;

              // First, translate to origin
              const translatedX = x - centerX;
              const translatedY = y - centerY;

              // Then rotate backwards by elementRotation
              const cos = Math.cos(-elementRotation);
              const sin = Math.sin(-elementRotation);
              const rotatedX = translatedX * cos - translatedY * sin;
              const rotatedY = translatedX * sin + translatedY * cos;

              // Check if the point is near the ellipse in its unrotated form
              const normalizedDistSq =
                (rotatedX * rotatedX) /
                  (circleData.radiusX * circleData.radiusX) +
                (rotatedY * rotatedY) /
                  (circleData.radiusY * circleData.radiusY);

              const strokeFactor =
                effectiveCheckRadius /
                Math.min(circleData.radiusX, circleData.radiusY);

              const outerThreshold = strokeFactor * 2; // Allow detection slightly outside
              const innerThreshold = strokeFactor * 2; // Allow detection slightly inside

              if (
                normalizedDistSq <= 1 + outerThreshold &&
                normalizedDistSq >= 1 - innerThreshold
              ) {
                return element.id;
              }
            } else {
              // For perfect circles or unrotated ellipses, use the original method
              const dx = x - circleData.center.x;
              const dy = y - circleData.center.y;

              const normalizedDistSq =
                (dx * dx) / (circleData.radiusX * circleData.radiusX) +
                (dy * dy) / (circleData.radiusY * circleData.radiusY);

              const strokeFactor =
                effectiveCheckRadius /
                Math.min(circleData.radiusX, circleData.radiusY);

              const outerThreshold = strokeFactor * 2;
              const innerThreshold = strokeFactor * 2;

              if (
                normalizedDistSq <= 1 + outerThreshold &&
                normalizedDistSq >= 1 - innerThreshold
              ) {
                return element.id;
              }
            }
            break;
          }
          case Tools.LINE: {
            const lineData = elementData as CanvasElements.Line;
            if (!lineData?.startPoint || !lineData?.endPoint) break;

            // Transform line points according to rotation
            let startPoint = { ...lineData.startPoint };
            let endPoint = { ...lineData.endPoint };

            if (elementRotation) {
              // Calculate the center of the line for rotation
              const centerX = (startPoint.x + endPoint.x) / 2;
              const centerY = (startPoint.y + endPoint.y) / 2;

              // Apply rotation to start point
              const startDx = startPoint.x - centerX;
              const startDy = startPoint.y - centerY;
              const cos = Math.cos(elementRotation);
              const sin = Math.sin(elementRotation);

              startPoint = {
                x: centerX + (startDx * cos - startDy * sin),
                y: centerY + (startDx * sin + startDy * cos),
              };

              // Apply rotation to end point
              const endDx = endPoint.x - centerX;
              const endDy = endPoint.y - centerY;

              endPoint = {
                x: centerX + (endDx * cos - endDy * sin),
                y: centerY + (endDx * sin + endDy * cos),
              };
            }

            const lineDistSq = distanceSqFromPointToSegment(
              x,
              y,
              startPoint.x,
              startPoint.y,
              endPoint.x,
              endPoint.y
            );

            if (lineDistSq <= effectiveCheckRadiusSq) {
              return element.id;
            }
            break;
          }
          case Tools.RECTANGLE:
          case Tools.STAR: {
            let vertices: Array<{ x: number; y: number }> = [];

            if (elementTool === Tools.RECTANGLE) {
              const rectData = elementData as CanvasElements.Rectangle;
              if (!rectData?.point) break;

              // Get the four corners of the rectangle
              const topLeft = rectData.point;
              const topRight = { x: topLeft.x + rectData.width, y: topLeft.y };
              const bottomRight = {
                x: topLeft.x + rectData.width,
                y: topLeft.y + rectData.height,
              };
              const bottomLeft = {
                x: topLeft.x,
                y: topLeft.y + rectData.height,
              };

              // Transform corners according to rotation
              vertices = [topLeft, topRight, bottomRight, bottomLeft];

              if (elementRotation) {
                // Calculate the center of the rectangle for rotation
                const centerX = topLeft.x + rectData.width / 2;
                const centerY = topLeft.y + rectData.height / 2;

                vertices = vertices.map(corner => {
                  const dx = corner.x - centerX;
                  const dy = corner.y - centerY;
                  const cos = Math.cos(elementRotation);
                  const sin = Math.sin(elementRotation);

                  return {
                    x: centerX + (dx * cos - dy * sin),
                    y: centerY + (dx * sin + dy * cos),
                  };
                });
              }
            } else if (elementTool === Tools.STAR) {
              const starData = elementData as CanvasElements.Star;
              if (!starData?.point || !starData?.radius || !starData?.spikes)
                break;

              // Calculate star vertices
              vertices = calculateStarVertices(
                starData.point,
                starData.radius,
                0.5, // innerRadiusRatio (default)
                starData.spikes
              );

              // Transform vertices according to rotation
              if (elementRotation) {
                const centerX = starData.point.x;
                const centerY = starData.point.y;

                vertices = vertices.map(vertex => {
                  const dx = vertex.x - centerX;
                  const dy = vertex.y - centerY;
                  const cos = Math.cos(elementRotation);
                  const sin = Math.sin(elementRotation);

                  return {
                    x: centerX + (dx * cos - dy * sin),
                    y: centerY + (dx * sin + dy * cos),
                  };
                });
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
        const {
          x: selX,
          y: selY,
          width: selW,
          height: selH,
          rotation = 0,
        } = selection;
        const normX = selW < 0 ? selX + selW : selX;
        const normY = selH < 0 ? selY + selH : selY;
        const normW = Math.abs(selW);
        const normH = Math.abs(selH);
        const halfW = normW / 2;
        const halfH = normH / 2;

        // Check for rotation handle first (positioned at the bottom-center + offset)
        const rotationHandleX = normX + halfW;
        const rotationHandleY = normY + normH + 30; // Positioned below the bottom edge
        const rotationHandleTouchRadiusSq = (HANDLE_TOUCH_AREA / 1.5) ** 2;

        const rotHandleDx = x - rotationHandleX;
        const rotHandleDy = y - rotationHandleY;
        if (
          rotHandleDx * rotHandleDx + rotHandleDy * rotHandleDy <
          rotationHandleTouchRadiusSq
        ) {
          // Start Rotating
          selectionStateRef.current = 'rotating';
          rotationHandleRef.current = true;

          // Calculate center of selection for rotation pivot
          const centerX = normX + halfW;
          const centerY = normY + halfH;

          // Calculate starting rotation angle
          rotationStartAngleRef.current = Math.atan2(y - centerY, x - centerX);
          initialAngleRef.current = rotation || 0;

          initialSelectionRef.current = cloneDeep(selection);
          initialCanvasElementsRef.current = cloneDeep(
            elements.filter(el => selection.ids.includes(el.id))
          );
          return;
        }

        // Regular scaling handles check
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

        // If selection is rotated, we need to transform the handle positions
        const rotatedHandles = rotation
          ? handles.map(handle => {
              // Calculate position relative to selection center
              const relativeX = handle.x - (normX + halfW);
              const relativeY = handle.y - (normY + halfH);

              // Apply rotation
              const cos = Math.cos(rotation);
              const sin = Math.sin(rotation);
              const rotatedX = relativeX * cos - relativeY * sin;
              const rotatedY = relativeX * sin + relativeY * cos;

              // Return absolute position
              return {
                x: rotatedX + (normX + halfW),
                y: rotatedY + (normY + halfH),
              };
            })
          : handles;

        const touchRadiusSq = (HANDLE_TOUCH_AREA / 2) ** 2;
        let touchedHandleIndex: number | null = null;
        for (let i = 0; i < rotatedHandles.length; i++) {
          const dx = x - rotatedHandles[i].x;
          const dy = y - rotatedHandles[i].y;
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
          scalingOriginRef.current = rotatedHandles[oppositeHandleIndex];
          initialSelectionRef.current = cloneDeep(selection);
          initialCanvasElementsRef.current = cloneDeep(
            elements.filter(el => selection.ids.includes(el.id))
          );
          return;
        }

        // Check if clicked inside the selection (for moving)
        // For rotated selections, we need to check if the point is inside the rotated box
        let isPointInside = false;

        if (rotation) {
          // For rotated bounding box, we transform the point to the selection's local coordinates
          const centerX = normX + halfW;
          const centerY = normY + halfH;

          // Calculate relative position
          const relX = x - centerX;
          const relY = y - centerY;

          // Rotate point in the opposite direction
          const cos = Math.cos(-rotation);
          const sin = Math.sin(-rotation);
          const rotatedX = relX * cos - relY * sin;
          const rotatedY = relX * sin + relY * cos;

          // Check if point is inside the non-rotated box
          isPointInside =
            rotatedX >= -halfW &&
            rotatedX <= halfW &&
            rotatedY >= -halfH &&
            rotatedY <= halfH;
        } else {
          // Non-rotated case: simple box check
          isPointInside =
            x >= normX &&
            x <= normX + normW &&
            y >= normY &&
            y <= normY + normH;
        }

        if (isPointInside) {
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
        setSelection({
          ids: [],
          x,
          y,
          width: 0,
          height: 0,
          selected: false,
          rotation: 0,
        });
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
        // --- Rotation Move ---
        else if (selectionStateRef.current === 'rotating') {
          if (
            !initialPointRef.current ||
            !initialSelectionRef.current ||
            !initialCanvasElementsRef.current
          )
            return;

          // Calculate center of selection for rotation pivot
          const {
            x: selX,
            y: selY,
            width: selW,
            height: selH,
          } = initialSelectionRef.current;
          const normX = selW < 0 ? selX + selW : selX;
          const normY = selH < 0 ? selY + selH : selY;
          const normW = Math.abs(selW);
          const normH = Math.abs(selH);
          const centerX = normX + normW / 2;
          const centerY = normY + normH / 2;

          // Calculate new angle based on current cursor position relative to center
          const newAngle = Math.atan2(y - centerY, x - centerX);

          // Calculate angle difference from start
          const angleDiff = newAngle - rotationStartAngleRef.current;

          // Apply the rotation (add to initial angle)
          const newRotation = initialAngleRef.current + angleDiff;

          // Update selection with new rotation
          setSelection({
            ...initialSelectionRef.current,
            rotation: newRotation,
          });

          // Update all selected elements
          const rotatedElements = initialCanvasElementsRef.current.map(
            initialElement => {
              const handler = toolHandlers[initialElement.tool];
              return handler?.rotateElement
                ? handler.rotateElement(
                    initialElement,
                    centerX,
                    centerY,
                    angleDiff
                  )
                : {
                    ...initialElement,
                    rotation: (initialElement.rotation || 0) + angleDiff,
                  };
            }
          );

          setElements(prevElements =>
            prevElements.map(
              el => rotatedElements.find(rotEl => rotEl.id === el.id) || el
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

          // For rotated selections, the scaling needs to work in the rotated coordinate system
          const origin = scalingOriginRef.current;
          const handleIndex = scalingHandleIndexRef.current;
          const rotation = initialSelectionRef.current.rotation || 0;
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
          const centerX = iNormX + iHalfW;
          const centerY = iNormY + iHalfH;

          // Get the initial handle position
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

          // If rotated, transform the handle positions
          const rotatedInitialHandles = rotation
            ? iHandles.map(handle => {
                // Calculate position relative to selection center
                const relativeX = handle.x - centerX;
                const relativeY = handle.y - centerY;

                // Apply rotation
                const cos = Math.cos(rotation);
                const sin = Math.sin(rotation);
                const rotatedX = relativeX * cos - relativeY * sin;
                const rotatedY = relativeX * sin + relativeY * cos;

                // Return absolute position
                return {
                  x: rotatedX + centerX,
                  y: rotatedY + centerY,
                };
              })
            : iHandles;

          const initialHandlePos = rotatedInitialHandles[handleIndex];

          // Convert the current point to the rotated coordinate system
          let currentRotatedPoint = { x, y };

          if (rotation) {
            // Calculate relative position to center
            const relX = x - centerX;
            const relY = y - centerY;

            // Apply inverse rotation
            const cos = Math.cos(-rotation);
            const sin = Math.sin(-rotation);
            const rotatedX = relX * cos - relY * sin;
            const rotatedY = relX * sin + relY * cos;

            currentRotatedPoint = {
              x: rotatedX + centerX,
              y: rotatedY + centerY,
            };
          }

          // Calculate scale factors in the rotated coordinate system
          const initialDeltaX = initialHandlePos.x - origin.x;
          const initialDeltaY = initialHandlePos.y - origin.y;

          // Get the correct delta based on the rotated coordinate system
          const currentDeltaX = currentRotatedPoint.x - origin.x;
          const currentDeltaY = currentRotatedPoint.y - origin.y;

          let scaleX = initialDeltaX === 0 ? 1 : currentDeltaX / initialDeltaX;
          let scaleY = initialDeltaY === 0 ? 1 : currentDeltaY / initialDeltaY;

          if ([1, 5].includes(handleIndex)) scaleX = 1;
          if ([3, 7].includes(handleIndex)) scaleY = 1;

          const MIN_SCALE = 0.01;
          if (Math.abs(scaleX) < MIN_SCALE)
            scaleX = Math.sign(scaleX || 1) * MIN_SCALE;
          if (Math.abs(scaleY) < MIN_SCALE)
            scaleY = Math.sign(scaleY || 1) * MIN_SCALE;

          // Scale elements in the rotated coordinate system
          const scaledElements = initialCanvasElementsRef.current.map(
            initialElement => {
              const handler = toolHandlers[initialElement.tool];
              return handler?.scaleElement
                ? handler.scaleElement(
                    initialElement,
                    scaleX,
                    scaleY,
                    origin,
                    rotation
                  )
                : initialElement;
            }
          );

          setElements(prevElements =>
            prevElements.map(
              el => scaledElements.find(scaledEl => scaledEl.id === el.id) || el
            )
          );

          // Calculate the new bounding box after scaling
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
              // Preserve rotation
              rotation: initialSelectionRef.current.rotation || 0,
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
          y,
          isShiftDown
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
      isShiftDown,
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
        // --- Rotation End ---
        else if (selectionStateRef.current === 'rotating') {
          if (
            !initialCanvasElementsRef.current ||
            !initialSelectionRef.current
          ) {
            selectionStateRef.current = selection.selected ? 'selected' : null;
            rotationHandleRef.current = false;
            rotationStartAngleRef.current = 0;
            initialAngleRef.current = 0;
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
              originalElements: initialCanvasElementsRef.current,
              newElements: finalElements,
            };
            addToHistory(action);
          }

          selectionStateRef.current = 'selected';
          initialPointRef.current = null;
          initialSelectionRef.current = null;
          initialCanvasElementsRef.current = [];
          rotationHandleRef.current = false;
          rotationStartAngleRef.current = 0;
          initialAngleRef.current = 0;
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
    return 'center' in element && 'radiusX' in element && 'radiusY' in element;
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

          // Check element type and apply appropriate offset
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
            // Add debug log to verify type guard is working
            console.log('Duplicating Circle:', newElement.element);

            // Ensure we're modifying a properly typed object
            const circleElement = newElement.element as CanvasElements.Circle;
            circleElement.center = {
              x: circleElement.center.x + OFFSET,
              y: circleElement.center.y + OFFSET,
            };

            // Log after modification to verify changes
            console.log('After duplication:', circleElement.center);
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
          } else {
            // If we can't identify the element type, log it
            console.warn(
              'Unrecognized element type during duplication:',
              newElement
            );
          }

          return newElement;
        });

        // Add the duplicated elements to state and history
        const action: HistoryAction = {
          type: 'ADD_ELEMENT',
          elements: newElements,
        };
        addToHistory(action);

        // Update the elements array with the new duplicated elements
        setElements(prev => [...prev, ...newElements]);

        // Update selection to focus on the newly duplicated elements
        const combinedBox = calculateCombinedBoundingBox(
          newElements,
          10,
          fontManager
        );
        if (
          combinedBox &&
          combinedBox.x !== undefined &&
          combinedBox.y !== undefined &&
          combinedBox.width !== undefined &&
          combinedBox.height !== undefined
        ) {
          setSelection({
            ids: newElements.map(el => el.id),
            x: combinedBox.x,
            y: combinedBox.y,
            width: combinedBox.width,
            height: combinedBox.height,
            selected: true,
          });
        }
      }
    }
  }, [selection, elements, generateId, addToHistory, setElements, fontManager]);

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
  return {
    ids: selectedIds,
    ...combinedBox,
    selected: true,
    // Preserve rotation if it exists, otherwise default to 0
    rotation: selection.rotation || 0,
  };
}
