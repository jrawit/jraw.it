import { useCallback, useState } from 'react';
import toolHandlers from './tool-handlers';
import { CanvasElement } from './useCanvas';

export type HistoryActionType =
  | 'ADD_ELEMENT'
  | 'MODIFY_ELEMENT'
  | 'DELETE_ELEMENT';

export type HistoryAction = {
  type: HistoryActionType;
  elementIds?: string[]; // Not used when adding elements
  elements?: CanvasElement[];
  offset?: { x: number; y: number };
  rotation?: number;
  scale?: { x: number; y: number };
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
        if (action.elementIds && action.offset) {
          // Restore the previous state of the modified elements
          const idsToModify = action.elementIds;
          const undoDeltaX = -action.offset.x;
          const undoDeltaY = -action.offset.y;

          setElements(prev =>
            prev.map(el => {
              if (idsToModify.includes(el.id)) {
                // Find the appropriate tool handler for the element
                const handler = toolHandlers[el.tool];
                if (handler && handler.moveElement) {
                  // Apply the inverse delta
                  return handler.moveElement(el, undoDeltaX, undoDeltaY);
                }
              }
              return el;
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
        if (action.elementIds && action.offset) {
          // Restore the modified elements to their new positions
          const idsToModify = action.elementIds;
          const redoDeltaX = action.offset.x;
          const redoDeltaY = action.offset.y;

          setElements(prev =>
            prev.map(el => {
              if (idsToModify.includes(el.id)) {
                // Find the appropriate tool handler for the element
                const handler = toolHandlers[el.tool];
                if (handler && handler.moveElement) {
                  // Apply the delta
                  return handler.moveElement(el, redoDeltaX, redoDeltaY);
                }
              }
              return el;
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
