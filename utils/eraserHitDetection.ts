import { CanvasElements } from '@/constants/CanvasElement';
import { Tools } from '@/constants/Tools';
import { CanvasElement } from '@/hooks/useCanvas';
import {
  getPointsOnSmoothedPathQuadratic,
  isPointNearPolygonOutline,
} from './geometryUtils';

// Point interface for consistent type usage
export interface Point {
  x: number;
  y: number;
}

// Transform a point using rotation around a center point
export const rotatePoint = (
  point: Point,
  center: Point,
  angle: number
): Point => {
  if (!angle) return point;

  // Translate to origin
  const translatedX = point.x - center.x;
  const translatedY = point.y - center.y;

  // Rotate
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;

  // Translate back
  return {
    x: rotatedX + center.x,
    y: rotatedY + center.y,
  };
};

// Calculate distance squared from point to line segment
export const distanceSqFromPointToSegment = (
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number => {
  const A = px - x1;
  const B = py - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = px - xx;
  const dy = py - yy;

  return dx * dx + dy * dy;
};

// Calculate the center of a triangle from points array or traditional triangle format
export const getTriangleCenter = (
  triangle: CanvasElements.Path | CanvasElements.Triangle
): Point => {
  if ('points' in triangle) {
    // Handle Path-based triangle (new format)
    if (!triangle.points || triangle.points.length < 3) {
      return { x: 0, y: 0 }; // Default if invalid
    }
    const [p1, p2, p3] = triangle.points;
    return {
      x: (p1.x + p2.x + p3.x) / 3,
      y: (p1.y + p2.y + p3.y) / 3,
    };
  } else {
    // Handle traditional Triangle format
    const { point1, point2, point3 } = triangle as CanvasElements.Triangle;
    return {
      x: (point1.x + point2.x + point3.x) / 3,
      y: (point1.y + point2.y + point3.y) / 3,
    };
  }
};

// Calculate the center of a path
export const getPathCenter = (path: CanvasElements.Path): Point => {
  let minX = Infinity,
    minY = Infinity;
  let maxX = -Infinity,
    maxY = -Infinity;

  path.points.forEach(point => {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  });

  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
  };
};

// Calculate the center of a line
export const getLineCenter = (line: CanvasElements.Line): Point => {
  return {
    x: (line.startPoint.x + line.endPoint.x) / 2,
    y: (line.startPoint.y + line.endPoint.y) / 2,
  };
};

// Helper: Check if point is near a path (polyline)
const isPointNearPath = (
  point: Point,
  pathData: CanvasElements.Path,
  eraserRadius: number
): boolean => {
  if (!pathData.points || pathData.points.length < 1) return false;
  // For smoother paths like PEN, consider using a smoothed version for hit detection
  const smoothedPoints = getPointsOnSmoothedPathQuadratic(pathData.points, 5); // Density can be adjusted

  const checkRadius = eraserRadius + (pathData.strokeWidth || 0) / 2;

  for (let i = 0; i < smoothedPoints.length - 1; i++) {
    if (
      distanceSqFromPointToSegment(
        point.x,
        point.y,
        smoothedPoints[i].x,
        smoothedPoints[i].y,
        smoothedPoints[i + 1].x,
        smoothedPoints[i + 1].y
      ) <=
      checkRadius * checkRadius
    ) {
      return true;
    }
  }
  return false;
};

// Helper: Check if point is near a line segment
const isPointNearLine = (
  point: Point,
  lineData: CanvasElements.Line,
  eraserRadius: number
): boolean => {
  const checkRadius = eraserRadius + (lineData.strokeWidth || 0) / 2;
  return (
    distanceSqFromPointToSegment(
      point.x,
      point.y,
      lineData.startPoint.x,
      lineData.startPoint.y,
      lineData.endPoint.x,
      lineData.endPoint.y
    ) <=
    checkRadius * checkRadius
  );
};

// Main function to check if the eraser hit an element
export const eraserHitTest = (
  point: Point,
  element: CanvasElement,
  eraserRadius: number = 5
): boolean => {
  const elementData = element.element;
  const rotation = element.rotation || 0;

  // Extract stroke width for threshold calculation
  let strokeWidth = 1;
  if ('strokeWidth' in elementData) {
    strokeWidth = (elementData as any).strokeWidth || 1;
  }
  const threshold = eraserRadius + strokeWidth / 2;

  switch (element.tool) {
    case Tools.PEN:
    case Tools.HIGHLIGHTER:
      return isPointNearPath(
        point,
        elementData as CanvasElements.Path,
        rotation,
        threshold + (elementData as CanvasElements.Path).strokeWidth / 2
      );

    case Tools.LINE:
      return isPointNearLine(
        point,
        elementData as CanvasElements.Line,
        rotation,
        threshold + (elementData as CanvasElements.Line).strokeWidth / 2
      );

    case Tools.RECTANGLE:
    case Tools.CIRCLE:
    case Tools.STAR:
    case Tools.TRIANGLE: {
      const pathData = elementData as CanvasElements.Path;
      if (!pathData.points || pathData.points.length < 2) return false;
      // For closed shapes, isPointNearPolygonOutline is more suitable.
      // It checks proximity to edges and also if the point is inside (for filled region).
      // The eraser should hit if near the outline.
      const checkRadius = eraserRadius + (pathData.strokeWidth || 0) / 2;
      return isPointNearPolygonOutline(point, pathData.points, checkRadius);
    }

    default:
      return false;
  }
};

// Main function to check if eraser hits triangle
export const eraserHitTriangle = (
  point: Point,
  element: CanvasElement,
  eraserRadius: number = 5
): boolean => {
  // Extract element data and rotation
  const elementData = element.element;
  const rotation = element.rotation || 0;

  // The threshold is the eraser radius plus half the stroke width
  let strokeWidth = 1;
  if ('strokeWidth' in elementData) {
    strokeWidth = (elementData as any).strokeWidth || 1;
  }
  const threshold = eraserRadius + strokeWidth / 2;

  return isPointNearTriangle(point, elementData, rotation, threshold);
};
