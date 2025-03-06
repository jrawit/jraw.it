import { Skia, SkPath } from "@shopify/react-native-skia";
import { useState, useCallback } from "react";

export enum Tools {
  PEN = "pen",
  LINE = "line",
  HIGHLIGHTER = "highlighter",
  /// Add more tools here
}

type PathData = {
  path: SkPath;
  tool: Tools;
};

export const useCanvas = () => {
  const [undoStack, setUndoStack] = useState<PathData[]>([]);
  const [redoStack, setRedoStack] = useState<PathData[]>([]);

  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [tool, setTool] = useState<Tools>(Tools.PEN);

  const startDrawing = useCallback(
    (x: number, y: number) => {
      const path = Skia.Path.Make();
      path.moveTo(x, y);
      setCurrentPath(path);

      if (tool === Tools.LINE) {
        setStartPoint({ x, y });
      }
    },
    [tool]
  );

  const moveDrawing = useCallback(
    (x: number, y: number) => {
      if (!currentPath) return;

      let path: SkPath = currentPath.copy();

      //TODO: Add more tools here

      switch (tool) {
        case Tools.LINE:
          if (startPoint) {
            path = Skia.Path.Make();
            path.moveTo(startPoint.x, startPoint.y); // Start point
            path.lineTo(x, y); // End point
          }
          break;
        case Tools.PEN:
        case Tools.HIGHLIGHTER:
        default:
          // For PEN and HIGHLIGHTER, behavior is the same
          path.lineTo(x, y);
          break;
      }

      setCurrentPath(path);
    },
    [currentPath, startPoint, tool]
  );

  const endDrawing = useCallback(() => {
    if (currentPath) {
      setUndoStack((prev) => [...prev, { path: currentPath, tool }]); // Add current path to undo stack
      setRedoStack([]); // Clear redo stack because we started a new path
      setCurrentPath(null);
      setStartPoint(null);
    }
  }, [currentPath, tool]);

  const undo = useCallback(() => {
    if (undoStack.length !== 0) {
      const lastPath = undoStack[undoStack.length - 1]; // Get last path
      setUndoStack((prev) => prev.slice(0, -1)); // Remove last path from undo stack
      setRedoStack((prev) => [...prev, lastPath!]); // Add last path to redo stack
    }
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length !== 0) {
      const lastPath = redoStack[redoStack.length - 1]; // Get last path
      setRedoStack((prev) => prev.slice(0, -1)); // Remove last path from redo stack
      setUndoStack((prev) => [...prev, lastPath!]); // Add last path to undo stack
    }
  }, [redoStack]);

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
  };
};
