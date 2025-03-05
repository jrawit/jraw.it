import { Skia, Path as SkPath } from "@shopify/react-native-skia";
import { useState, useCallback, useRef, useEffect } from "react";

export enum Tools {
  PEN = "pen",
  LINE = "line",
  /// Add more tools here
}

export const useCanvas = () => {
  const [paths, setPaths] = useState<SkPath[]>([]);
  const [undonePaths, setUndonePaths] = useState<SkPath[]>([]);
  const [currentPath, setCurrentPath] = useState<SkPath | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [tool, setTool] = useState<Tools>(Tools.PEN);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const updatePosition = () => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setOffset({ x: rect.left, y: rect.top });
      }
    };
    
    updatePosition();
    window.addEventListener("resize", updatePosition);
    return () => window.removeEventListener("resize", updatePosition);
  }, []);

  const startDrawing = useCallback((x: number, y: number) => {
    const canvasX = x - offset.x;
    const canvasY = y - offset.y;
    
    if (tool === Tools.LINE) {
      setStartPoint({ x: canvasX, y: canvasY });
      const path = Skia.Path.Make();
      path.moveTo(canvasX, canvasY);
      setCurrentPath(path);
    } else {
      const path = Skia.Path.Make();
      path.moveTo(canvasX, canvasY);
      setCurrentPath(path);
    }
  }, [offset, tool]);

  const moveDrawing = useCallback((x: number, y: number) => {
    if (!currentPath) return;
    
    const canvasX = x - offset.x;
    const canvasY = y - offset.y;

    if (tool === Tools.LINE && startPoint) {
      const newPath = Skia.Path.Make();
      newPath.moveTo(startPoint.x, startPoint.y);
      newPath.lineTo(canvasX, canvasY);
      setCurrentPath(newPath);
    } else {
      const newPath = currentPath.copy();
      newPath.lineTo(canvasX, canvasY);
      setCurrentPath(newPath);
    }
  }, [currentPath, offset, startPoint, tool]);

  const endDrawing = useCallback(() => {
    if (currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setUndonePaths([]); // Clear redo stack when new drawing is made
      setCurrentPath(null);
      setStartPoint(null);
    }
  }, [currentPath]);

  const undo = () => {
    setPaths(prev => {
      if (prev.length === 0) return prev;
      const lastPath = prev[prev.length - 1];
      setUndonePaths(prevUndone => [...prevUndone, lastPath]);
      return prev.slice(0, -1);
    });
  };

  const redo = () => {
    setUndonePaths(prev => {
      if (prev.length === 0) return prev;
      const lastUndone = prev[prev.length - 1];
      setPaths(prevPaths => [...prevPaths, lastUndone]);
      return prev.slice(0, -1);
    });
  };

  const clear = () => {
    setPaths([]);
    setUndonePaths([]);
  };

  return {
    paths,
    currentPath,
    canvasRef,
    tool,
    setTool,
    handlePointerDown: (e: React.PointerEvent) => {
      startDrawing(e.clientX, e.clientY);
    },
    handlePointerMove: (e: React.PointerEvent) => {
      if (e.buttons === 1) moveDrawing(e.clientX, e.clientY);
    },
    handlePointerUp: endDrawing,
    undo,
    redo,
    clear,
  };
};