import { CanvasElement } from '@/hooks/useCanvas';
import { useCallback, useState } from 'react';
import { useElectricCanvas } from './useElectric';
// Assuming CanvasElementRecord might be co-located or defined in a shared types file

// Define Action Types
export type AddAction = { type: 'ADD_ELEMENT'; elements: CanvasElement[] };
export type DeleteAction = {
  type: 'DELETE_ELEMENT';
  elements: CanvasElement[];
};
export type ModifyAction = {
  type: 'MODIFY_ELEMENT';
  elementIds: string[];
  originalElements: CanvasElement[]; // Partial list of elements before modification
  newElements: CanvasElement[]; // Partial list of elements after modification
};

// Define the Union Type for all possible actions
export type HistoryAction = AddAction | DeleteAction | ModifyAction;

export const useCanvasHistory = (
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>,
  clearSelection: () => void,
  electricActions: ReturnType<typeof useElectricCanvas>,
  roomId: string | undefined // Add roomId as a parameter
) => {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const addToHistory = useCallback((action: HistoryAction) => {
    console.log('Adding to history:', action.type, action); // Optional logging
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const newUndoStack = [...undoStack];
    const lastAction = newUndoStack.pop(); // Get the last action and remove it from the new stack
    if (!lastAction) return;

    console.log('Undoing:', lastAction.type, lastAction); // Optional logging

    // Restore state based on action type
    switch (lastAction.type) {
      case 'ADD_ELEMENT':
        // Remove the added elements
        setElements(prev =>
          prev.filter(
            el => !lastAction.elements.some(added => added.id === el.id)
          )
        );
        // Call electric remove for each element
        lastAction.elements.forEach(element => {
          electricActions.removeElement(element.id);
        });
        break;
      case 'DELETE_ELEMENT':
        // Re-add the deleted elements
        setElements(prev => [...prev, ...lastAction.elements]);
        // Call electric add for each element
        if (roomId) {
          lastAction.elements.forEach(element => {
            electricActions.addElement({
              id: element.id,
              room_id: roomId,
              tool_type: String(element.tool),
              element_data: JSON.stringify(element.element),
            });
          });
        }
        break;
      case 'MODIFY_ELEMENT':
        // Restore previous state for modified elements (partial update)
        setElements(prev => {
          const originalMap = new Map(
            lastAction.originalElements.map(el => [el.id, el])
          );
          // Map over previous state, replacing elements found in the originalMap
          return prev.map(
            currentEl => originalMap.get(currentEl.id) || currentEl
          );
        });
        // Call electric update for each original element state
        if (roomId) {
          lastAction.originalElements.forEach(originalElement => {
            electricActions.updateElement(originalElement.id, {
              tool_type: String(originalElement.tool),
              element_data: JSON.stringify(originalElement.element),
            });
          });
        }
        break;
    }

    // Add the undone action to the redo stack and update the undo stack
    setRedoStack(prev => [lastAction, ...prev]);
    setUndoStack(newUndoStack);
    clearSelection(); // Clear selection after undo/redo
  }, [undoStack, setElements, clearSelection, electricActions]); // Added electricActions

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const newRedoStack = [...redoStack];
    const nextAction = newRedoStack.shift(); // Get the next action and remove it from the new stack
    if (!nextAction) return;

    console.log('Redoing:', nextAction.type, nextAction); // Optional logging

    // Apply state change based on action type
    switch (nextAction.type) {
      case 'ADD_ELEMENT':
        // Re-add the elements
        setElements(prev => [...prev, ...nextAction.elements]);
        // Call electric add for each element
        if (roomId) {
          nextAction.elements.forEach(element => {
            electricActions.addElement({
              id: element.id,
              room_id: roomId,
              tool_type: String(element.tool),
              element_data: JSON.stringify(element.element),
            });
          });
        }
        break;
      case 'DELETE_ELEMENT':
        // Re-delete the elements
        setElements(prev =>
          prev.filter(
            el => !nextAction.elements.some(deleted => deleted.id === el.id)
          )
        );
        // Call electric remove for each element
        nextAction.elements.forEach(element => {
          electricActions.removeElement(element.id);
        });
        break;
      case 'MODIFY_ELEMENT':
        // Apply new state for modified elements (partial update)
        setElements(prev => {
          const newMap = new Map(nextAction.newElements.map(el => [el.id, el]));
          // Map over previous state, replacing elements found in the newMap
          return prev.map(currentEl => newMap.get(currentEl.id) || currentEl);
        });
        // Call electric update for each new element state
        if (roomId) {
          nextAction.newElements.forEach(newElement => {
            electricActions.updateElement(newElement.id, {
              tool_type: String(newElement.tool),
              element_data: JSON.stringify(newElement.element),
            });
          });
        }
        break;
    }

    // Add the redone action back to the undo stack and update the redo stack
    setUndoStack(prev => [...prev, nextAction]);
    setRedoStack(newRedoStack);
    clearSelection(); // Clear selection after undo/redo
  }, [redoStack, setElements, clearSelection, electricActions]); // Added electricActions

  // Optional: Function to clear the history stacks
  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    // Expose stacks if needed for UI (e.g., disabling buttons)
    // undoStack,
    // redoStack,
    addToHistory,
    undo,
    redo,
    clear, // Expose clear if you have a button for it
  };
};
