import { useCallback, useState } from 'react';
import { CanvasElement } from './useCanvas'; // Adjust import path if needed

// Define Action Types
export type AddAction = { type: 'ADD_ELEMENT'; elements: CanvasElement[] };
export type DeleteAction = { type: 'DELETE_ELEMENT'; elements: CanvasElement[] };
export type ModifyAction = {
  type: 'MODIFY_ELEMENT';
  elementIds: string[];
  originalElements: CanvasElement[]; // Partial list of elements before modification
  newElements: CanvasElement[]; // Partial list of elements after modification
};
export type EraseAction = {
  type: 'ERASE_ACTION';
  originalState: CanvasElement[]; // Full state before erase
  finalState: CanvasElement[]; // Full state after erase
};

// Define the Union Type for all possible actions
export type HistoryAction = AddAction | DeleteAction | ModifyAction | EraseAction;

export const useCanvasHistory = (
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>,
  clearSelection: () => void
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
        setElements(prev => prev.filter(el => !lastAction.elements.some(added => added.id === el.id)));
        break;
      case 'DELETE_ELEMENT':
        // Re-add the deleted elements
        setElements(prev => [...prev, ...lastAction.elements]);
        break;
      case 'MODIFY_ELEMENT':
        // Restore previous state for modified elements (partial update)
        setElements(prev => {
          const originalMap = new Map(lastAction.originalElements.map(el => [el.id, el]));
          // Map over previous state, replacing elements found in the originalMap
          return prev.map(currentEl => originalMap.get(currentEl.id) || currentEl);
        });
        break;
      case 'ERASE_ACTION':
        // Restore the complete state from before the erase
        setElements(lastAction.originalState);
        break;
    }

    // Add the undone action to the redo stack and update the undo stack
    setRedoStack(prev => [lastAction, ...prev]);
    setUndoStack(newUndoStack);
    clearSelection(); // Clear selection after undo/redo
  }, [undoStack, setElements, clearSelection]);

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
        break;
      case 'DELETE_ELEMENT':
        // Re-delete the elements
        setElements(prev => prev.filter(el => !nextAction.elements.some(deleted => deleted.id === el.id)));
        break;
      case 'MODIFY_ELEMENT':
        // Apply new state for modified elements (partial update)
        setElements(prev => {
          const newMap = new Map(nextAction.newElements.map(el => [el.id, el]));
          // Map over previous state, replacing elements found in the newMap
          return prev.map(currentEl => newMap.get(currentEl.id) || currentEl);
        });
        break;
      case 'ERASE_ACTION':
        // Restore the complete state from after the erase
        setElements(nextAction.finalState);
        break;
    }

    // Add the redone action back to the undo stack and update the redo stack
    setUndoStack(prev => [...prev, nextAction]);
    setRedoStack(newRedoStack);
    clearSelection(); // Clear selection after undo/redo
  }, [redoStack, setElements, clearSelection]);

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