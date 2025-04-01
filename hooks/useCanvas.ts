import { CanvasElements } from '@/constants/CanvasElement';
import {
  Selection as SelectionType,
  calculateCombinedBoundingBox,
  findElementsInSelection,
} from '@/utils/selectionUtils';
import { useCallback, useState } from 'react';
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

export type Selection = SelectionType;

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

  const [moveOffset, setMoveOffset] = useState<{
    x: number;
    y: number;
    originalSelectionX?: number;
    originalSelectionY?: number;
  } | null>(null);

  const [originalElements, setOriginalElements] = useState<
    CanvasElement[] | null
  >(null);

  // History management
  const {
    addToHistory,
    undo,
    redo,
    clear: clearHistory,
  } = useCanvasHistory(setElements, setSelection);

  // ID generation
  const generateId = useCallback(() => uuidv4(), []);

  // Input handlers
  const onStartInput = useCallback(
    (x: number, y: number) => {
      // If we have a selection and we're using the select tool, check if we're clicking inside it
      if (
        tool === Tools.SELECT &&
        selection &&
        selection.state === 'selected'
      ) {
        // Check if click is inside the selection
        if (
          x >= selection.x &&
          x <= selection.x + selection.width &&
          y >= selection.y &&
          y <= selection.y + selection.height
        ) {
          // Start moving the selection - store initial position AND original selection coordinates
          setMoveOffset({
            x,
            y,
            originalSelectionX: selection.x,
            originalSelectionY: selection.y,
          });
          // Save original elements to reference during move
          setOriginalElements([...elements]);
          return;
        }
      }

      // Rest of existing code
      if (tool === Tools.SELECT) {
        setSelection({
          ids: [],
          x,
          y,
          width: 0,
          height: 0,
          state: 'selecting',
        });
        return;
      }

      setSelection(null);

      // Use the tool handler to create the element
      if (toolHandlers[tool]) {
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
      // If we're moving a selection
      if (moveOffset && selection && originalElements) {
        const deltaX = x - moveOffset.x;
        const deltaY = y - moveOffset.y;

        // Update the selection box position to show movement preview
        setSelection(prev => {
          if (!prev) return null;

          // Important: Start with the original selection position
          const originalX = moveOffset.originalSelectionX;
          const originalY = moveOffset.originalSelectionY;

          return {
            ...prev,
            x: originalX! + deltaX,
            y: originalY! + deltaY,
          };
        });

        // Update element positions based on their original positions
        setElements(
          originalElements.map(originalElement => {
            if (
              selection.ids.includes(originalElement.id) &&
              toolHandlers[originalElement.tool]?.moveElement
            ) {
              return toolHandlers[originalElement.tool]!.moveElement(
                originalElement,
                deltaX,
                deltaY
              );
            }
            return originalElement;
          })
        );

        return;
      }

      // Rest of your existing code for other tools
      if (
        tool === Tools.SELECT &&
        selection &&
        selection.state === 'selecting'
      ) {
        setSelection(prev => {
          if (!prev) return null;
          return {
            ...prev,
            width: x - prev.x,
            height: y - prev.y,
          };
        });
        return;
      }

      if (currentElement && toolHandlers[tool]) {
        const updatedElement = toolHandlers[tool].updateElement(
          currentElement,
          x,
          y
        );
        setCurrentElement(updatedElement);
      }
    },
    [currentElement, tool, selection, moveOffset, originalElements]
  );

  const onEndInput = useCallback(
    (x: number, y: number) => {
      // If we were moving elements, finalize their position
      if (moveOffset && selection && originalElements) {
        // Add to history using original elements as previous state
        const action: HistoryAction = {
          type: 'MODIFY_ELEMENT',
          elementIds: selection.ids,
          elements: elements,
          previousData: originalElements,
        };

        addToHistory(action);

        // Reset state
        setMoveOffset(null);
        setOriginalElements(null);
        return;
      }

      // Existing selection handling
      if (tool === Tools.SELECT) {
        handleSelectionEnd(
          x,
          y,
          selection,
          elements,
          setSelection,
          fontManager
        );
        return;
      }

      // Existing element handling...
      if (currentElement) {
        const action: HistoryAction = {
          type: 'ADD_ELEMENT',
          elementIds: [currentElement.id],
          elements: [currentElement],
        };

        setElements(prev => [...prev, currentElement]);
        addToHistory(action);
        setCurrentElement(null);
      }
    },
    [
      currentElement,
      tool,
      elements,
      selection,
      addToHistory,
      moveOffset,
      originalElements,
    ]
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
        elementIds: [newElementData.id],
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

      const action: HistoryAction = {
        type: 'MODIFY_ELEMENT',
        elementIds: ids,
        elements: modifiedElements,
        previousData: elements,
      };

      addToHistory(action);
    },
    [elements, addToHistory]
  );

  // Complete clear action
  const clear = useCallback(() => {
    setElements([]);
    setCurrentElement(null);
    setSelection(null);
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
function handleSelectionEnd(
  x: number,
  y: number,
  selection: Selection | null,
  elements: CanvasElement[],
  setSelection: React.Dispatch<React.SetStateAction<Selection | null>>,
  fontManager?: any
) {
  if (!selection) return;

  const MINIMUM_SELECTION_SIZE = 5;

  // Check if clicking outside
  if (
    selection.state !== 'selecting' &&
    (selection.x > x ||
      selection.x + selection.width < x ||
      selection.y > y ||
      selection.y + selection.height < y)
  ) {
    setSelection(null);
    return;
  }

  // Check if too small
  if (
    Math.abs(selection.width) < MINIMUM_SELECTION_SIZE &&
    Math.abs(selection.height) < MINIMUM_SELECTION_SIZE
  ) {
    setSelection(null);
    return;
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

  console.log('Selected elements:', selectedElements);

  if (selectedElements.length === 0) {
    setSelection(null);
    return;
  }

  const selectedIds = selectedElements.map(element => element.id);
  const combinedBox = calculateCombinedBoundingBox(
    selectedElements,
    10,
    fontManager
  );

  console.log('Combined box:', combinedBox);

  if (combinedBox) {
    setSelection({
      ids: selectedIds,
      ...combinedBox,
      state: 'selected',
    });
  } else {
    setSelection(null);
  }
}
