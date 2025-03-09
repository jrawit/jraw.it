import { Skia, SkPath } from '@shopify/react-native-skia';
import { useState, useCallback } from 'react';
import { Tools } from '../constants/Tools';

type PathData = {
  path: SkPath;
  tool: Tools;
  strokeWidth: number;
};

export const useCanvas = () => {
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [redoStack, setRedoStack] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [tool, setTool] = useState<Tools>(Tools.PEN);
  const [strokeWidth, setStrokeWidth] = useState(2);

  const startDrawing = useCallback(
    (x: number, y: number) => {
      const path = Skia.Path.Make();
      path.moveTo(x, y);
      setCurrentPath(path);

      if (tool === Tools.LINE) {
        setStartPoint({ x, y });
      } else {
        setStartPoint(null);
      }
    },
    [tool]
  );

  const moveDrawing = useCallback(
    (x: number, y: number) => {
      if (!currentPath) return;
      let path = currentPath.copy();

      switch (tool) {
        case Tools.LINE:
          if (startPoint) {
            path = Skia.Path.Make();
            path.moveTo(startPoint.x, startPoint.y);
            path.lineTo(x, y);
          }
          break;
        case Tools.PEN:
        case Tools.HIGHLIGHTER:
        case Tools.ERASER:
          path.lineTo(x, y);
          break;
      }

      setCurrentPath(path);
    },
    [currentPath, startPoint, tool]
  );

  const endDrawing = useCallback(() => {
    if (currentPath) {
      setUndoStack(prev => [...prev, { path: currentPath, tool, strokeWidth }]);
      setRedoStack([]);
      setCurrentPath(null);
      setStartPoint(null);
    }
  }, [currentPath, tool, strokeWidth]);

  const undo = useCallback(() => {
    if (undoStack.length !== 0) {
      const lastPath = undoStack.pop();
      setUndoStack([...undoStack]);
      setRedoStack([...redoStack, lastPath!]);
    }
  }, [undoStack, redoStack]);

  const redo = useCallback(() => {
    if (redoStack.length !== 0) {
      const lastPath = redoStack.pop();
      setRedoStack([...redoStack]);
      setUndoStack([...undoStack, lastPath!]);
    }
  }, [undoStack, redoStack]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  return {
    paths: undoStack,
    currentPath,
    tool,
    setTool,
    handlePointerDown: startDrawing,
    handlePointerMove: moveDrawing,
    handlePointerUp: endDrawing,
    undo,
    redo,
    clear,
    strokeWidth,
    setStrokeWidth,
  };
};
