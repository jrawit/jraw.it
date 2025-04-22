import { useCallback, useState } from 'react';
import { CanvasElement } from './useCanvas';

export type HistoryAction =
  | { type: 'ADD_ELEMENT'; elements: CanvasElement[] }
  | { type: 'DELETE_ELEMENT'; elements: CanvasElement[] }
  | {
      type: 'MODIFY_ELEMENT';
      elementIds: string[];
      originalElements: CanvasElement[]; // Store original state for undo
      newElements: CanvasElement[]; // Store new state for redo
    };

export const useCanvasHistory = (
  setElements: React.Dispatch<React.SetStateAction<CanvasElement[]>>,
  clearSelection: () => void
) => {
  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

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
        if (action.elementIds && action.originalElements) {
          const idsToModify = action.elementIds;

          setElements(prev =>
            prev.map(el => {
              const index = idsToModify.indexOf(el.id);
              return index !== -1 ? action.originalElements[index] : el;
            })
          );
        }
        break;
      case 'DELETE_ELEMENT':
        if (action.elements) {
          // Re-add the previously deleted elements
          setElements(prev => [...prev, ...(action.elements || [])]);
        }
        break;
    }

    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
    clearSelection();
  }, [undoStack, setElements, clearSelection]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];

    switch (action.type) {
      case 'ADD_ELEMENT':
        if (action.elements) {
          // Re-add the previously undone elements
          setElements(prev => [...prev, ...(action.elements || [])]);
        }
        break;
      case 'MODIFY_ELEMENT':
        if (action.elementIds && action.newElements) {
          const idsToModify = action.elementIds;

          setElements(prev =>
            prev.map(el => {
              const index = idsToModify.indexOf(el.id);
              return index !== -1 ? action.newElements[index] : el;
            })
          );
        }
        break;
      case 'DELETE_ELEMENT':
        if (action.elements) {
          // Delete the previously undone elements
          const elementIds = action.elements.map(p => p.id);
          setElements(prev => prev.filter(p => !elementIds.includes(p.id)));
        }
        break;
    }

    // Move the action back to the undo stack
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
    clearSelection();
  }, [redoStack, setElements, clearSelection]);

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
