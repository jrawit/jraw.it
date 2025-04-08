import { CanvasElements } from '@/constants/CanvasElement';
import { cloneDeep } from 'lodash';
import { ToolData, Tools } from '../constants/Tools';
import { CanvasElement } from './useCanvas';

type ToolHandler = {
  initElement?: (
    x: number,
    y: number,
    strokeWidth: number,
    color: string,
    generateId: () => string
  ) => CanvasElement;
  updateElement?: (
    element: CanvasElement,
    x: number,
    y: number
  ) => CanvasElement;
  moveElement?: (
    element: CanvasElement,
    deltaX: number,
    deltaY: number
  ) => CanvasElement;
};

const toolHandlers: Partial<Record<Tools, ToolHandler>> = {
  [Tools.PEN]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        points: [{ x, y }],
        strokeWidth: ToolData[Tools.PEN].sizeTransform(strokeWidth),
        strokeColor: ToolData[Tools.PEN].colorTransform(color),
        capStyle: ToolData[Tools.PEN].cap,
        blendMode: ToolData[Tools.PEN].blendMode,
      } as CanvasElements.Path,
      tool: Tools.PEN,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points.push({ x, y });
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(point => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      }));
      return newElement;
    },
  },
  [Tools.HIGHLIGHTER]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        points: [{ x, y }],
        strokeWidth: ToolData[Tools.HIGHLIGHTER].sizeTransform(strokeWidth),
        strokeColor: ToolData[Tools.HIGHLIGHTER].colorTransform(color),
        capStyle: ToolData[Tools.HIGHLIGHTER].cap,
        blendMode: ToolData[Tools.HIGHLIGHTER].blendMode,
      } as CanvasElements.Path,
      tool: Tools.HIGHLIGHTER,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points.push({ x, y });
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(point => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      }));
      return newElement;
    },
  },
  [Tools.ERASER]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        points: [{ x, y }],
        strokeWidth: ToolData[Tools.ERASER].sizeTransform(strokeWidth),
        strokeColor: ToolData[Tools.ERASER].colorTransform(color),
        capStyle: ToolData[Tools.ERASER].cap,
        blendMode: ToolData[Tools.ERASER].blendMode,
      } as CanvasElements.Path,
      tool: Tools.ERASER,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points.push({ x, y });
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      // We should not move the eraser path
      return element;
    },
  },
  [Tools.LINE]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        startPoint: { x, y },
        endPoint: { x, y },
        strokeWidth,
        strokeColor: color,
      } as CanvasElements.Line,
      tool: Tools.LINE,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const line = newElement.element as CanvasElements.Line;
      line.endPoint = { x, y };
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const line = newElement.element as CanvasElements.Line;
      line.startPoint = {
        x: line.startPoint.x + deltaX,
        y: line.startPoint.y + deltaY,
      };
      line.endPoint = {
        x: line.endPoint.x + deltaX,
        y: line.endPoint.y + deltaY,
      };
      return newElement;
    },
  },
  [Tools.CIRCLE]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        center: { x, y },
        radius: 0,
        strokeWidth,
        strokeColor: color,
      } as CanvasElements.Circle,
      tool: Tools.CIRCLE,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const circle = newElement.element as CanvasElements.Circle;
      circle.radius = Math.sqrt(
        Math.pow(x - circle.center.x, 2) + Math.pow(y - circle.center.y, 2)
      );
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const circle = newElement.element as CanvasElements.Circle;
      circle.center = {
        x: circle.center.x + deltaX,
        y: circle.center.y + deltaY,
      };
      return newElement;
    },
  },
  [Tools.RECTANGLE]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        point: { x, y },
        width: 0,
        height: 0,
        strokeWidth,
        strokeColor: color,
      } as CanvasElements.Rectangle,
      tool: Tools.RECTANGLE,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const rect = newElement.element as CanvasElements.Rectangle;
      rect.width = x - rect.point.x;
      rect.height = y - rect.point.y;
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const rect = newElement.element as CanvasElements.Rectangle;
      rect.point = {
        x: rect.point.x + deltaX,
        y: rect.point.y + deltaY,
      };
      return newElement;
    },
  },
  [Tools.TRIANGLE]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        point1: { x, y },
        point2: { x, y },
        point3: { x, y },
        strokeWidth,
        strokeColor: color,
      } as CanvasElements.Triangle,
      tool: Tools.TRIANGLE,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const triangle = newElement.element as CanvasElements.Triangle;

      triangle.point2 = { x, y: triangle.point1.y };
      triangle.point3 = {
        x: Math.min(triangle.point1.x, x) + Math.abs(triangle.point1.x - x) / 2,
        y,
      };

      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const triangle = newElement.element as CanvasElements.Triangle;
      triangle.point1 = {
        x: triangle.point1.x + deltaX,
        y: triangle.point1.y + deltaY,
      };
      triangle.point2 = {
        x: triangle.point2.x + deltaX,
        y: triangle.point2.y + deltaY,
      };
      triangle.point3 = {
        x: triangle.point3.x + deltaX,
        y: triangle.point3.y + deltaY,
      };
      return newElement;
    },
  },
  [Tools.STAR]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        point: { x, y },
        radius: 0,
        spikes: 5,
        strokeWidth,
        strokeColor: color,
      } as CanvasElements.Star,
      tool: Tools.STAR,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const star = newElement.element as CanvasElements.Star;
      star.radius = Math.sqrt(
        Math.pow(x - star.point.x, 2) + Math.pow(y - star.point.y, 2)
      );
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const star = newElement.element as CanvasElements.Star;
      star.point = {
        x: star.point.x + deltaX,
        y: star.point.y + deltaY,
      };
      return newElement;
    },
  },
  [Tools.TEXT]: {
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const text = newElement.element as CanvasElements.Text;
      text.point = {
        x: text.point.x + deltaX,
        y: text.point.y + deltaY,
      };
      return newElement;
    },
  },
  [Tools.IMAGE]: {
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const image = newElement.element as CanvasElements.Image;
      image.point = {
        x: image.point.x + deltaX,
        y: image.point.y + deltaY,
      };
      return newElement;
    },
  },
};

// Helper for processing and scaling images
export const processImageForCanvas = (
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  maxImageDimension: number = 1024
): { width: number; height: number } => {
  // Calculate resize dimensions while maintaining aspect ratio
  let resizeWidth = imageWidth;
  let resizeHeight = imageHeight;

  // First, limit to max dimension if needed
  if (imageWidth > maxImageDimension || imageHeight > maxImageDimension) {
    if (imageWidth > imageHeight) {
      resizeWidth = maxImageDimension;
      resizeHeight = Math.floor(imageHeight * (maxImageDimension / imageWidth));
    } else {
      resizeHeight = maxImageDimension;
      resizeWidth = Math.floor(imageWidth * (maxImageDimension / imageHeight));
    }
  }

  // Check if the image needs to be scaled down to fit canvas
  const needsScaling = resizeWidth > canvasWidth || resizeHeight > canvasHeight;

  if (needsScaling) {
    // Scale to fit 90% of the canvas
    const widthRatio = (canvasWidth * 0.9) / resizeWidth;
    const heightRatio = (canvasHeight * 0.9) / resizeHeight;
    const scaleFactor = Math.min(widthRatio, heightRatio);

    resizeWidth = resizeWidth * scaleFactor;
    resizeHeight = resizeHeight * scaleFactor;
  }

  return { width: resizeWidth, height: resizeHeight };
};

export default toolHandlers;
