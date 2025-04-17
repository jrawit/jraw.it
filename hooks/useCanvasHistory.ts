import { useCallback, useState } from 'react';
import toolHandlers from './tool-handlers';
import { CanvasElement } from './useCanvas';

export type HistoryActionType =
  | 'ADD_ELEMENT'
  | 'MODIFY_ELEMENT'
  | 'DELETE_ELEMENT';

export type HistoryAction = {
  type: HistoryActionType;
  // For multi-element operations like move or delete
  elementIds?: string[];
  elements?: CanvasElement[]; // Used for ADD/DELETE
  // For single element property modifications
  elementId?: string;
  originalElement?: CanvasElement;
  newElement?: CanvasElement;
  // For move operations
  offset?: { x: number; y: number };
  // Future use
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
        // Handle move undo
        if (action.elementIds && action.offset) {
          const idsToModify = action.elementIds;
          const undoDeltaX = -action.offset.x;
          const undoDeltaY = -action.offset.y;

          setElements(prev =>
            prev.map(el => {
              if (idsToModify.includes(el.id)) {
                const handler = toolHandlers[el.tool];
                if (handler && handler.moveElement) {
                  return handler.moveElement(el, undoDeltaX, undoDeltaY);
                }
              }
              return el;
            })
          );
        }
        // Handle property change undo
        else if (action.elementId && action.originalElement) {
          setElements(prev =>
            prev.map(el =>
              el.id === action.elementId ? action.originalElement! : el
            )
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
        // Handle move redo
        if (action.elementIds && action.offset) {
          const idsToModify = action.elementIds;
          const redoDeltaX = action.offset.x;
          const redoDeltaY = action.offset.y;

          setElements(prev =>
            prev.map(el => {
              if (idsToModify.includes(el.id)) {
                const handler = toolHandlers[el.tool];
                if (handler && handler.moveElement) {
                  return handler.moveElement(el, redoDeltaX, redoDeltaY);
                }
              }
              return el;
            })
          );
        }
        // Handle property change redo
        else if (action.elementId && action.newElement) {
          setElements(prev =>
            prev.map(el =>
              el.id === action.elementId ? action.newElement! : el
            )
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
