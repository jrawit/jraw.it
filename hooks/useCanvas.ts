import { Skia, SkPath } from '@shopify/react-native-skia';
import { useCallback, useMemo, useState } from 'react';
import { Tools } from '../constants/Tools';

type PathData = {
  id: string;
  path: SkPath;
  tool: Tools;
  strokeWidth: number;
  fill: boolean;
  color: string;
};

// Action types for history
type HistoryActionType =
  | 'ADD_PATH' // Adding a new path
  | 'MODIFY_PATH' // Modifying a path (e.g. moving it)
  | 'FILL_PATH'; // Filling an existing path

type HistoryAction = {
  type: HistoryActionType;
  pathIds?: string[]; // IDs of affected paths
  pathData?: PathData[]; // Full path data for ADD_PATH
  previousData?: any; // Previous state for undo
};

type SelectionBounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
  maxX: number;
  maxY: number;
  isValid: boolean;
};

const createLinePath = (x1: number, y1: number, x2: number, y2: number) => {
  const path = Skia.Path.Make();
  path.moveTo(x1, y1);
  path.lineTo(x2, y2);
  return path;
};

const createRectanglePath = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const path = Skia.Path.Make();
  path.moveTo(x1, y1);
  path.lineTo(x1, y2);
  path.lineTo(x2, y2);
  path.lineTo(x2, y1);
  path.lineTo(x1, y1);
  path.close();
  return path;
};

const createCirclePath = (x1: number, y1: number, x2: number, y2: number) => {
  const path = Skia.Path.Make();
  const radiusX = Math.abs(x2 - x1);
  const radiusY = Math.abs(y2 - y1);
  // Create oval (ellipse) using a rect that defines the bounds
  path.addOval(
    Skia.XYWHRect(
      x1 - radiusX, // left
      y1 - radiusY, // top
      radiusX * 2, // width
      radiusY * 2 // height
    )
  );
  path.close();
  return path;
};

const createTrianglePath = (x1: number, y1: number, x2: number, y2: number) => {
  const path = Skia.Path.Make();
  // Start at the bottom point (apex)
  path.moveTo(x1, y2);
  // Draw lines to form a base at the top
  const width = Math.abs(x2 - x1) * 2;
  path.lineTo(x1 - width / 2, y1);
  path.lineTo(x1 + width / 2, y1);
  path.lineTo(x1, y2);
  path.close();
  return path;
};

const createStarPath = (x1: number, y1: number, x2: number, y2: number) => {
  const path = Skia.Path.Make();

  // Calculate separate x and y radii for non-uniform scaling
  const radiusX = Math.abs(x2 - x1);
  const radiusY = Math.abs(y2 - y1);

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
    const outerX = x1 + radiusX * Math.cos(outerAngle);
    const outerY = y1 + radiusY * Math.sin(outerAngle);
    const innerX = x1 + innerRadiusX * Math.cos(innerAngle);
    const innerY = y1 + innerRadiusY * Math.sin(innerAngle);

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

  return path;
};

export const useCanvas = () => {
  const [paths, setPaths] = useState<PathData[]>([]);

  const [undoStack, setUndoStack] = useState<HistoryAction[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryAction[]>([]);

  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [tool, setTool] = useState<Tools>(Tools.PEN);
  const [strokeWidth, setStrokeWidth] = useState(2);

  const [selectedItems, setSelectedItems] = useState<PathData[]>([]);

  // Generate a unique ID for new paths
  const generatePathId = useCallback(() => {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }, []);

  const selectionBounds = useMemo((): SelectionBounds => {
    // Default invalid bounds
    const defaultBounds = {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      width: 0,
      height: 0,
      isValid: false,
    };

    if (selectedItems.length === 0 || tool !== Tools.SELECT) {
      return defaultBounds;
    }

    // Calculate a single bounding rectangle for all selected items
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    selectedItems.forEach(({ path, strokeWidth }) => {
      const bounds = path.getBounds();
      const halfStroke = strokeWidth / 2;
      minX = Math.min(minX, bounds.x - halfStroke);
      minY = Math.min(minY, bounds.y - halfStroke);
      maxX = Math.max(maxX, bounds.x + bounds.width + halfStroke);
      maxY = Math.max(maxY, bounds.y + bounds.height + halfStroke);
    });

    // Check if bounds are valid
    const isValid = isFinite(minX) && selectedItems.length > 0;
    const width = maxX - minX;
    const height = maxY - minY;

    return {
      minX,
      minY,
      maxX,
      maxY,
      width,
      height,
      isValid,
    };
  }, [selectedItems, tool]);

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
        case Tools.SELECT:
          setStartPoint({ x, y });
          setDragPoint({ x, y });
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
            path = createLinePath(startPoint.x, startPoint.y, x, y);
          }
          break;
        case Tools.CIRCLE:
          if (startPoint) {
            path = createCirclePath(startPoint.x, startPoint.y, x, y);
          }
          break;
        case Tools.RECTANGLE:
          if (startPoint) {
            path = createRectanglePath(startPoint.x, startPoint.y, x, y);
          }
          break;
        case Tools.TRIANGLE:
          if (startPoint) {
            path = createTrianglePath(startPoint.x, startPoint.y, x, y);
          }
          break;
        case Tools.STAR:
          if (startPoint) {
            path = createStarPath(startPoint.x, startPoint.y, x, y);
          }
          break;
        case Tools.SELECT:
          // Check if x and y are within the bounds of the selection
          if (
            selectionBounds.isValid &&
            x >= selectionBounds.minX &&
            x <= selectionBounds.maxX &&
            y >= selectionBounds.minY &&
            y <= selectionBounds.maxY
          ) {
            const dx = x - dragPoint!.x;
            const dy = y - dragPoint!.y;
            // Move all selected items by the same delta
            selectedItems.forEach(({ path }) => {
              path.offset(dx, dy);
            });
            // Offset the selection bounds
            selectionBounds.minX += dx;
            selectionBounds.minY += dy;
            selectionBounds.maxX += dx;
            selectionBounds.maxY += dy;

            // Update the drah point for the next move
            setDragPoint({ x, y });
          } else if (dragPoint) {
            setSelectedItems([]);
            path = createRectanglePath(dragPoint.x, dragPoint.y, x, y);
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
    (x: number, y: number, color: string) => {
      if (currentPath && tool != Tools.SELECT) {
        // Create a new path with a unique ID
        const newPathData: PathData = {
          id: generatePathId(),
          path: currentPath,
          tool,
          strokeWidth,
          fill: false,
          color: color,
        };

        // Create an action for adding a path
        const action: HistoryAction = {
          type: 'ADD_PATH',
          pathData: [newPathData],
        };

        // Update current paths state
        setPaths(prev => [...prev, newPathData]);

        // Add action to undo stack
        setUndoStack(prev => [...prev, action]);
        setRedoStack([]);
      }

      // Clear selected items if x and y are not within selection bounds
      if (
        !selectionBounds.isValid ||
        x < selectionBounds.minX ||
        x > selectionBounds.maxX ||
        y < selectionBounds.minY ||
        y > selectionBounds.maxY
      ) {
        setSelectedItems([]);
      }

      if (tool === Tools.SELECT) {
        if (selectionBounds.isValid) {
          // If selection exists, add move action to undo stack
          if (startPoint) {
            const dx = x - startPoint.x;
            const dy = y - startPoint.y;

            // Update undo stack with move action
            const action: HistoryAction = {
              type: 'MODIFY_PATH',
              pathIds: selectedItems.map(p => p.id),
              previousData: selectedItems.map(p => ({
                id: p.id,
                dx: -dx, // Invert delta to undo
                dy: -dy,
              })),
            };

            setUndoStack(prev => [...prev, action]);
            setRedoStack([]);
          }
        } else {
          // If no selection exists, calculate new selection bounds
          for (let i = 0; i < paths.length; i++) {
            const pathObject = paths[i];
            if (pathObject.tool == Tools.ERASER) continue;
            if (pathObject.tool == Tools.HIGHLIGHTER) continue;

            const bounds = pathObject.path.getBounds();
            const testPoints = [
              { x: bounds.x, y: bounds.y }, // Top left
              { x: bounds.x + bounds.width, y: bounds.y }, // Top right
              { x: bounds.x, y: bounds.y + bounds.height }, // Bottom left
              { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // Bottom right
              {
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2,
              }, // Center
            ];

            const pointsInside = testPoints.filter(point =>
              currentPath?.contains(point.x, point.y)
            );

            if (pointsInside.length > 0) {
              setSelectedItems(prev => [...prev, pathObject]);
            }
          }
        }
      }

      setCurrentPath(null);
      setStartPoint(null);

      if (tool === Tools.BUCKETFILL) {
        for (let i = 0; i < paths.length; i++) {
          const pathObject = paths[i];
          if (pathObject.fill) continue;
          if (pathObject.tool == Tools.BUCKETFILL) continue;
          if (pathObject.tool == Tools.ERASER) continue;
          if (pathObject.tool == Tools.HIGHLIGHTER) continue;

          if (pathObject.path.contains(x, y)) {
            // Create new path data that's filled
            const filledPath: PathData = {
              id: generatePathId(),
              path: pathObject.path.copy(),
              tool: pathObject.tool,
              strokeWidth: pathObject.strokeWidth,
              fill: true,
              color: color,
            };

            // Create fill action
            const action: HistoryAction = {
              type: 'FILL_PATH',
              pathData: [filledPath],
              previousData: {
                pathId: pathObject.id,
                wasFilled: pathObject.fill,
              },
            };

            // Add to paths and history
            setPaths(prev => [...prev, filledPath]);
            setUndoStack(prev => [...prev, action]);
            setRedoStack([]);
            return;
          }
        }
      }
    },
    [currentPath, tool, strokeWidth, generatePathId, paths]
  );

  const undo = useCallback(() => {
    setSelectedItems([]);

    if (undoStack.length === 0) return;

    // Get the last action
    const action = undoStack[undoStack.length - 1];

    // Process the action based on its type
    switch (action.type) {
      case 'ADD_PATH':
        if (action.pathData) {
          // Remove the added path(s)
          const pathIds = action.pathData.map(p => p.id);
          setPaths(prev => prev.filter(p => !pathIds.includes(p.id)));
        }
        break;
      case 'FILL_PATH':
        if (action.pathData && action.previousData) {
          // Restore previous fill state
          setPaths(prev => prev.filter(p => p.id !== action.pathData![0].id));
        }
        break;
      case 'MODIFY_PATH':
        // Move paths back to original positions
        if (action.pathIds && action.previousData) {
          setPaths(prev =>
            prev.map(pathData => {
              // Find if this path was modified
              const modification:
                | { id: string; dx: number; dy: number }
                | undefined = action.previousData.find(
                (mod: { id: string; dx: number; dy: number }) =>
                  mod.id === pathData.id
              );
              if (modification) {
                // Apply the reverse transformation (stored in previousData)
                pathData.path.offset(modification.dx, modification.dy);
                return { ...pathData };
              }
              return pathData;
            })
          );
        }
        break;
    }

    // Move action from undo to redo stack
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, action]);
  }, [undoStack]);

  const redo = useCallback(() => {
    setSelectedItems([]);

    if (redoStack.length === 0) return;

    // Get the last action
    const action = redoStack[redoStack.length - 1];

    // Process the action based on its type
    switch (action.type) {
      case 'ADD_PATH':
        if (action.pathData) {
          // Re-add the paths
          setPaths(prev => [...prev, ...action.pathData!]);
        }
        break;
      case 'FILL_PATH':
        if (action.pathData) {
          // Re-apply fill
          setPaths(prev => [...prev, action.pathData![0]]);
        }
        break;
      case 'MODIFY_PATH':
        // Move paths back to modified positions
        if (action.pathIds && action.previousData) {
          setPaths(prev =>
            prev.map(pathData => {
              // Find if this path was modified
              const modification:
                | {
                    id: string;
                    dx: number;
                    dy: number;
                  }
                | undefined = action.previousData.find(
                (mod: { id: string; dx: number; dy: number }) =>
                  mod.id === pathData.id
              );
              if (modification) {
                // Apply the forward transformation

                pathData.path.offset(-modification.dx, -modification.dy);

                return { ...pathData };
              }
              return pathData;
            })
          );
        }
        break;
    }

    // Move action from redo to undo stack
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, action]);
  }, [redoStack]);

  const clear = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
    setPaths([]);
    setSelectedItems([]);
    setCurrentPath(null);
  }, [paths]);

  return {
    paths,
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
    selectedItems,
    selectionBounds,
  };
};
