import { Selection } from '@/utils/selectionUtils';
import { useCallback, useState } from 'react';
import { CanvasElement } from './useCanvas';

export type HistoryActionType =
  | 'ADD_ELEMENT'
  | 'MODIFY_ELEMENT'
  | 'DELETE_ELEMENT';

export type HistoryAction = {
  type: HistoryActionType;
  elementIds?: string[];
  elements?: CanvasElement[];
  previousData?: CanvasElement[];
};

export const useCanvasHistory = (
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>,
  setSelection: React.Dispatch<React.SetStateAction<Selection | null>>
) => {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);
  const [selection, setSelectionState] = useState<Selection | null>(null);

  const addToHistory = useCallback((action: HistoryAction) => {
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]);
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];

    switch (action.type) {
      case 'ADD_ELEMENT':
        if (action.elements) {
          const elementIds = action.elements.map(p => p.id);
          setElements(prev => prev.filter(p => !elementIds.includes(p.id)));
        }
        break;
      case 'MODIFY_ELEMENT':
        if (action.previousData) {
          // Restore elements to their previous state
          setElements(prev => {
            // Start with all elements that weren't modified
            const unmodifiedElements = prev.filter(
              p => !action.elementIds?.includes(p.id)
            );
            // Add back the elements in their previous state
            return [...unmodifiedElements, ...(action.previousData || [])];
          });
        }
        break;
      case 'DELETE_ELEMENT':
        if (action.elements) {
          // Restore deleted elements
          setElements(prev => [...prev, ...(action.elements || [])]);
        }
        break;
    }

    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);

    // Instead of always clearing, just reset to null if currently has a value
    if (selection) {
      setSelection(null);
    }
  }, [undoStack, setElements, setSelection, selection]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    // Get the last action from the redo stack
    const action = redoStack[redoStack.length - 1];

    // Process the action based on its type
    switch (action.type) {
      case 'ADD_ELEMENT':
        if (action.elements) {
          // Re-add the previously undone elements
          setElements(prev => [...prev, ...(action.elements || [])]);
        }
        break;
      case 'MODIFY_ELEMENT':
        if (action.elements) {
          // Apply the modifications again
          setElements(prev => {
            // Start with all elements that weren't modified
            const unmodifiedElements = prev.filter(
              p => !action.elementIds?.includes(p.id)
            );
            // Add the modified elements
            const modifiedElements = action.elements?.filter(e =>
              action.elementIds?.includes(e.id)
            );
            return [...unmodifiedElements, ...(modifiedElements || [])];
          });
        }
        break;
      case 'DELETE_ELEMENT':
        if (action.elementIds) {
          // Re-delete the elements
          setElements(prev =>
            prev.filter(p => !action.elementIds?.includes(p.id))
          );
        }
        break;
    }

    // Move the action back to the undo stack
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);

    // Instead of always clearing, just reset to null if currently has a value
    if (selection) {
      setSelection(null);
    }
  }, [redoStack, setElements, setSelection, selection]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    undoStack,
    redoStack,
    addToHistory,
    undo,
    redo,
    clear,
  };
};
