import { CanvasElements } from '@/constants/CanvasElement';
import {
  Selection,
  calculateCombinedBoundingBox,
  findElementsInSelection,
} from '@/utils/selectionUtils';
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

type SelectionState = 'selecting' | 'moving' | 'selected' | null;

export const useCanvas = ({
  tool,
  strokeWidth,
  color,
  fontManager,
}: CanvasProps) => {
  // States
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [currentElement, setCurrentElement] = useState<CanvasElement | null>(
    null
  );

  const [selection, setSelection] = useState<Selection | null>(null);
  const selectionStateRef = useRef<SelectionState>(null);
  const initialPointRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const initialSelectionRef = useRef<Selection | null>(null);
  const initialCanvasElementsRef = useRef<CanvasElement[]>([]);

  const clearSelection = useCallback(() => {
    setSelection(null);
    selectionStateRef.current = null;
    initialPointRef.current = null;
    initialSelectionRef.current = null;
    initialCanvasElementsRef.current = [];
  }, []);

  // History management
  const {
    addToHistory,
    undo,
    redo,
    clear: clearHistory,
  } = useCanvasHistory(setElements, clearSelection);

  // ID generation
  const generateId = useCallback(() => uuidv4(), []);

  // Input handlers
  const onStartInput = useCallback(
    (x: number, y: number) => {
      // If we have a selection and we're using the select tool, check if we're clicking inside it
      if (
        tool === Tools.SELECT &&
        selection &&
        selectionStateRef.current === 'selected'
      ) {
        if (
          x >= selection.x &&
          x <= selection.x + selection.width &&
          y >= selection.y &&
          y <= selection.y + selection.height
        ) {
          // Set the initial point to the current position and the selection
          initialPointRef.current = { x, y };
          initialSelectionRef.current = selection;
          initialCanvasElementsRef.current = elements.filter(element =>
            selection.ids.includes(element.id)
          );
          selectionStateRef.current = 'moving';
        } else {
          // Clicked outside the selected area, clear selection
          clearSelection();
        }

        return;
      }

      // Start new selection
      if (tool === Tools.SELECT) {
        setSelection({
          ids: [],
          x,
          y,
          width: 0,
          height: 0,
        });
        selectionStateRef.current = 'selecting';
        return;
      }

      clearSelection();

      // Use the tool handler to create the element
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
    [tool, strokeWidth, color, generateId, selection, elements]
  );

  const onMoveInput = useCallback(
    (x: number, y: number) => {
      // If we're moving or selecting
      if (selection && selectionStateRef.current) {
        if (selectionStateRef.current === 'selecting') {
          // Update the selection box position
          setSelection(prev => {
            if (!prev) return null;
            return {
              ...prev,
              width: x - selection.x, // Delta X
              height: y - selection.y, // Delta Y
            };
          });
        } else if (selectionStateRef.current === 'moving') {
          // Update the selection box and move the elements

          if (!initialPointRef.current) return;

          const deltaX = x - initialPointRef.current.x;
          const deltaY = y - initialPointRef.current.y;

          // Move the selection box by deltaX and deltaY
          setSelection(prev => {
            if (!prev) return null;
            if (!initialSelectionRef.current) return null;

            return {
              ...prev,
              x: initialSelectionRef.current.x + deltaX,
              y: initialSelectionRef.current!.y + deltaY,
            };
          });

          // Map the initial elements to their IDs
          const initialElementsMap = new Map(
            initialCanvasElementsRef.current.map(element => [
              element.id,
              element,
            ])
          );

          // Construct new elements based on the delta
          const newElements = elements.map(element => {
            // Check if the element is in the selection
            if (!selection.ids.includes(element.id)) return element; // Not selected

            const handler = toolHandlers[element.tool];
            const initialElement = initialElementsMap.get(element.id); // Get the initial element
            if (!initialElement) return element; // Should not happen
            if (handler && handler.moveElement) {
              return handler.moveElement(initialElement, deltaX, deltaY); // Move the element
            }
            return element;
          });

          setElements(newElements);
        }
      }

      if (
        currentElement &&
        toolHandlers[tool] &&
        toolHandlers[tool].updateElement
      ) {
        // Adding new "frames" of the element
        const updatedElement = toolHandlers[tool].updateElement(
          currentElement,
          x,
          y
        );
        setCurrentElement(updatedElement);
      }
    },
    [currentElement, tool, selection]
  );

  const onEndInput = useCallback(
    (x: number, y: number) => {
      // If we were selecting or moving elements
      if (selection && selectionStateRef.current) {
        // If we were moving
        if (selectionStateRef.current === 'moving') {
          // Finalize move, set state to 'selected'
          selectionStateRef.current = 'selected';
          // Add history action for move
          const finalDeltaX = x - initialPointRef.current!.x;
          const finalDeltaY = y - initialPointRef.current!.y;
          const action: HistoryAction = {
            type: 'MODIFY_ELEMENT',
            elementIds: selection.ids,
            offset: { x: finalDeltaX, y: finalDeltaY },
          };
          addToHistory(action);
          // Reset selection move state
          initialPointRef.current = null;
          initialSelectionRef.current = null;
          initialCanvasElementsRef.current = [];
          return; // Keep selection active after move
        }

        // If we were selecting
        if (selectionStateRef.current === 'selecting') {
          const newSelection = calculateSelectionBounds(
            selection,
            elements,
            fontManager
          );
          setSelection(newSelection);
          // Set state based on whether a selection was found
          selectionStateRef.current = newSelection ? 'selected' : null;
          return;
        }
      }

      // Existing element handling...
      if (currentElement) {
        const action: HistoryAction = {
          type: 'ADD_ELEMENT',
          elements: [currentElement],
        };

        setElements(prev => [...prev, currentElement]);
        addToHistory(action);
        setCurrentElement(null);
      }
    },
    [currentElement, tool, elements, selection, addToHistory, fontManager]
  );

  // External element handling
  const addExternalElement = useCallback(
    (element: CanvasElements.Any, tool: Tools) => {
      const newElementData: CanvasElement = {
        id: generateId(),
        element,
        tool,
      };

      const action: HistoryAction = {
        type: 'ADD_ELEMENT',
        elements: [newElementData],
      };

      setElements(prev => [...prev, newElementData]);
      addToHistory(action);
    },
    [generateId, addToHistory]
  );

  // Simplified modification handler
  const modifyElements = useCallback(
    (ids: string[], newElement: CanvasElements.Any) => {
      const modifiedElements = elements.map(element => {
        if (ids.includes(element.id)) {
          return { ...element, element: newElement };
        }
        return element;
      });

      setElements(modifiedElements);
    },
    [elements, addToHistory]
  );

  // Complete clear action
  const clear = useCallback(() => {
    setElements([]);
    setCurrentElement(null);
    clearSelection();
    clearHistory();
  }, [clearHistory]);

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
    modifyElements,
    selection,
  };
};

// Helper function for selection logic
function calculateSelectionBounds(
  selection: Selection | null, // Use the local Selection type (without state)
  elements: CanvasElement[],
  fontManager?: any
): Selection | null {
  // Return type is Selection | null
  if (!selection) return null;

  const MINIMUM_SELECTION_SIZE = 5;

  // Check if too small
  if (
    Math.abs(selection.width) < MINIMUM_SELECTION_SIZE &&
    Math.abs(selection.height) < MINIMUM_SELECTION_SIZE
  ) {
    return null;
  }

  // Normalize selection coordinates (handle negative width/height)
  const normalizedSelection = {
    ...selection,
    x: selection.width < 0 ? selection.x + selection.width : selection.x,
    y: selection.height < 0 ? selection.y + selection.height : selection.y,
    width: Math.abs(selection.width),
    height: Math.abs(selection.height),
  };

  // Process valid selection with normalized coordinates
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
  };
}
