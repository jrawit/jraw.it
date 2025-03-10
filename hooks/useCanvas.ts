import { Skia, SkPath } from '@shopify/react-native-skia';
import { useCallback, useState } from 'react';
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
        case Tools.CIRCLE:
        case Tools.RECTANGLE:
        case Tools.TRIANGLE:
        case Tools.STAR:
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
        case Tools.CIRCLE:
          if (startPoint) {
            path = Skia.Path.Make();
            const radiusX = Math.abs(x - startPoint.x);
            const radiusY = Math.abs(y - startPoint.y);
            // Create oval (ellipse) using a rect that defines the bounds
            path.addOval(
              Skia.XYWHRect(
                startPoint.x - radiusX, // left
                startPoint.y - radiusY, // top
                radiusX * 2, // width
                radiusY * 2 // height
              )
            );
            path.close();
          }
          break;
        case Tools.RECTANGLE:
          if (startPoint) {
            path = Skia.Path.Make();
            path.moveTo(startPoint.x, startPoint.y);
            path.lineTo(startPoint.x, y);
            path.lineTo(x, y);
            path.lineTo(x, startPoint.y);
            path.lineTo(startPoint.x, startPoint.y);
            path.close();
          }
          break;
        case Tools.TRIANGLE:
          if (startPoint) {
            path = Skia.Path.Make();
            // Start at the bottom point (apex)
            path.moveTo(startPoint.x, y);
            // Draw lines to form a base at the top
            const width = Math.abs(x - startPoint.x) * 2;
            path.lineTo(startPoint.x - width / 2, startPoint.y);
            path.lineTo(startPoint.x + width / 2, startPoint.y);
            path.lineTo(startPoint.x, y);
            path.close();
          }
          break;
        case Tools.STAR:
          if (startPoint) {
            path = Skia.Path.Make();

            // Calculate separate x and y radii for non-uniform scaling
            const radiusX = Math.abs(x - startPoint.x);
            const radiusY = Math.abs(y - startPoint.y);

            // Inner radius proportions remain the same, but applied separately to x and y
            const innerRadiusX = radiusX * 0.38;
            const innerRadiusY = radiusY * 0.38;

            // Draw the five-pointed star with separate x and y scaling
            for (let i = 0; i < 5; i++) {
              // Outer point angle (72° * i, starting with top point)
              const outerAngle = (Math.PI * 2 * i) / 5 - Math.PI / 2;
              // Inner point angle (36° offset from outer points)
              const innerAngle = outerAngle + Math.PI / 5;

              // Calculate coordinates using separate x and y radii for elliptical effect
              const outerX = startPoint.x + radiusX * Math.cos(outerAngle);
              const outerY = startPoint.y + radiusY * Math.sin(outerAngle);
              const innerX = startPoint.x + innerRadiusX * Math.cos(innerAngle);
              const innerY = startPoint.y + innerRadiusY * Math.sin(innerAngle);

              // For first point, move to position; for others, draw line
              if (i === 0) {
                path.moveTo(outerX, outerY);
              } else {
                path.lineTo(outerX, outerY);
              }

              // Connect to inner point
              path.lineTo(innerX, innerY);
            }

            // Close the path to complete the star
            path.close();
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

  const endDrawing = useCallback(
    (x: number, y: number) => {
      if (currentPath) {
        setUndoStack(prev => [
          ...prev,
          { path: currentPath, tool, strokeWidth, fill: false },
        ]);
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
              fill: true,
            };

            setUndoStack(prev => [...prev, filledPath]);
            setRedoStack([]);
            return;
          }
        }
      }
    },
    [currentPath, tool, strokeWidth]
  );

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
