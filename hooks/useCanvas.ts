import { Skia, SkPath } from '@shopify/react-native-skia';
import { useState, useCallback } from 'react';
import { Tools } from '../constants/Tools';

type PathData = {
  path: SkPath;
  tool: Tools;
  strokeWidth: number;
  fill: boolean;
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

      if (Tools.BUCKETFILL !== tool) {
        const path = Skia.Path.Make();
        path.moveTo(x, y);
        setCurrentPath(path);
      }

      switch (tool) {
        case Tools.LINE:
          setStartPoint({ x, y });
          break;
        default:
          setStartPoint(null);
          break;
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

  const endDrawing = useCallback((x: number, y: number) => {
    if (currentPath) {
      setUndoStack(prev => [...prev, { path: currentPath, tool, strokeWidth, fill: false }]);
      setRedoStack([]);
    }

    setCurrentPath(null);
    setStartPoint(null);

    if (tool === Tools.BUCKETFILL) {
      for (let i = 0; i < undoStack.length; i++) {
        const pathObject = undoStack[i];
        if (pathObject.fill) continue;
        if (pathObject.tool == Tools.BUCKETFILL) continue;
        if (pathObject.tool == Tools.ERASER) continue;
        if (pathObject.tool == Tools.HIGHLIGHTER) continue;

        if (pathObject.path.contains(x, y)) {
          const filledPath = {
            path: pathObject.path.copy(),
            tool: pathObject.tool,
            strokeWidth: pathObject.strokeWidth,
            fill: true
          };
          
          setUndoStack(prev => [...prev, filledPath]);
          setRedoStack([]);
          return;
        }
      }
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
