import { CanvasElements } from '@/constants/CanvasElement';
import { Tools } from '@/constants/Tools';
import { CanvasElement } from '@/hooks/useCanvas';
import { calculateStarVertices } from './geometryUtils';

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

// Calculate the center of a rectangle
export const getRectangleCenter = (rect: CanvasElements.Rectangle): Point => {
  return {
    x: rect.point.x + rect.width / 2,
    y: rect.point.y + rect.height / 2,
  };
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

// Calculate the center of a star
export const getStarCenter = (star: CanvasElements.Star): Point => {
  return star.point;
};

// Check if a point is near a triangle (considering rotation)
export const isPointNearTriangle = (
  point: Point,
  triangle: CanvasElements.Path | CanvasElements.Triangle,
  rotation: number = 0,
  threshold: number = 5
): boolean => {
  // If triangle is represented as Path (new format), use the path hit detection logic
  if ('points' in triangle && triangle.closed) {
    return isPointNearPath(
      point,
      triangle as CanvasElements.Path,
      rotation,
      threshold
    );
  }

  // For traditional Triangle format, convert to path points first
  let pathPoints: Point[] = [];

  if ('points' in triangle) {
    // Path-based triangle (new format)
    if (!triangle.points || triangle.points.length < 3) {
      return false; // Invalid triangle
    }
    pathPoints = [...triangle.points];
    // Close the path by adding the first point again
    if (
      pathPoints.length >= 3 &&
      (pathPoints[0].x !== pathPoints[pathPoints.length - 1].x ||
        pathPoints[0].y !== pathPoints[pathPoints.length - 1].y)
    ) {
      pathPoints.push({ ...pathPoints[0] });
    }
  } else {
    // Traditional Triangle format
    const { point1, point2, point3 } = triangle as CanvasElements.Triangle;
    if (!point1 || !point2 || !point3) {
      return false; // Invalid triangle
    }
    pathPoints = [point1, point2, point3, point1]; // Closed path
  }

  // Create a temporary path object
  const tempPath: CanvasElements.Path = {
    points: pathPoints,
    strokeWidth: 'strokeWidth' in triangle ? triangle.strokeWidth : 1,
    strokeColor: 'strokeColor' in triangle ? triangle.strokeColor : '#000000',
  };

  // Use the same logic as path hit detection
  return isPointNearPath(point, tempPath, rotation, threshold);
};

// Check if a point is near a rectangle (considering rotation)
export const isPointNearRectangle = (
  point: Point,
  rect: CanvasElements.Rectangle,
  rotation: number = 0,
  threshold: number = 5
): boolean => {
  const center = getRectangleCenter(rect);

  // Get the four corners of the rectangle
  const corners = [
    { x: rect.point.x, y: rect.point.y },
    { x: rect.point.x + rect.width, y: rect.point.y },
    { x: rect.point.x + rect.width, y: rect.point.y + rect.height },
    { x: rect.point.x, y: rect.point.y + rect.height },
  ];

  // Transform corners if the rectangle is rotated
  let transformedCorners = corners;
  if (rotation) {
    transformedCorners = corners.map(corner =>
      rotatePoint(corner, center, rotation)
    );
  }

  // Check if the point is near any edge
  for (let i = 0; i < 4; i++) {
    const start = transformedCorners[i];
    const end = transformedCorners[(i + 1) % 4];

    const distSq = distanceSqFromPointToSegment(
      point.x,
      point.y,
      start.x,
      start.y,
      end.x,
      end.y
    );

    if (distSq <= threshold * threshold) {
      return true;
    }
  }

  return false;
};

// Check if a point is near a circle/oval (considering rotation)
export const isPointNearCircle = (
  point: Point,
  circle: CanvasElements.Circle,
  rotation: number = 0,
  threshold: number = 5
): boolean => {
  const { center, radiusX, radiusY } = circle;

  // For a rotated ellipse, we need to transform the test point
  if (rotation && radiusX !== radiusY) {
    // Apply inverse rotation to the test point
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    const dx = point.x - center.x;
    const dy = point.y - center.y;

    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;

    // Calculate normalized distance to ellipse
    const normalizedDist = Math.sqrt(
      (rotatedX * rotatedX) / (radiusX * radiusX) +
        (rotatedY * rotatedY) / (radiusY * radiusY)
    );

    // Check if point is near the ellipse edge
    const normalizedThreshold = threshold / Math.min(radiusX, radiusY);
    return Math.abs(normalizedDist - 1) <= normalizedThreshold;
  }

  // For circles or non-rotated ellipses
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  const normalizedDistSq =
    (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);

  const normalizedThreshold = threshold / Math.min(radiusX, radiusY);
  return Math.abs(Math.sqrt(normalizedDistSq) - 1) <= normalizedThreshold;
};

// Check if a point is near a line (considering rotation)
export const isPointNearLine = (
  point: Point,
  line: CanvasElements.Line,
  rotation: number = 0,
  threshold: number = 5
): boolean => {
  if (!rotation) {
    // No rotation, just use simple distance check
    return (
      distanceSqFromPointToSegment(
        point.x,
        point.y,
        line.startPoint.x,
        line.startPoint.y,
        line.endPoint.x,
        line.endPoint.y
      ) <=
      threshold * threshold
    );
  }

  // With rotation, transform the point relative to the line's center
  const center = getLineCenter(line);

  // Apply inverse rotation to the test point
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  const testPoint = {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };

  // Now check against the unrotated line
  const rotatedStart = rotatePoint(line.startPoint, center, -rotation);
  const rotatedEnd = rotatePoint(line.endPoint, center, -rotation);

  return (
    distanceSqFromPointToSegment(
      testPoint.x,
      testPoint.y,
      rotatedStart.x,
      rotatedStart.y,
      rotatedEnd.x,
      rotatedEnd.y
    ) <=
    threshold * threshold
  );
};

// Check if a point is near a star (considering rotation)
export const isPointNearStar = (
  point: Point,
  star: CanvasElements.Star,
  rotation: number = 0,
  threshold: number = 5
): boolean => {
  // Calculate star vertices
  const vertices = calculateStarVertices(
    star.point,
    star.radius,
    0.5, // innerRadiusRatio (default)
    star.spikes
  );

  // Transform vertices if star is rotated
  let transformedVertices = vertices;
  if (rotation) {
    transformedVertices = vertices.map(vertex =>
      rotatePoint(vertex, star.point, rotation)
    );
  }

  // Check if point is near any edge of the star
  for (let i = 0; i < transformedVertices.length; i++) {
    const start = transformedVertices[i];
    const end = transformedVertices[(i + 1) % transformedVertices.length];

    const distSq = distanceSqFromPointToSegment(
      point.x,
      point.y,
      start.x,
      start.y,
      end.x,
      end.y
    );

    if (distSq <= threshold * threshold) {
      return true;
    }
  }

  return false;
};

// Check if a point is near a path (considering rotation)
export const isPointNearPath = (
  point: Point,
  path: CanvasElements.Path,
  rotation: number = 0,
  threshold: number = 5
): boolean => {
  if (!path.points || path.points.length < 2) return false;

  if (!rotation) {
    // No rotation, check directly against path segments
    for (let i = 1; i < path.points.length; i++) {
      const distSq = distanceSqFromPointToSegment(
        point.x,
        point.y,
        path.points[i - 1].x,
        path.points[i - 1].y,
        path.points[i].x,
        path.points[i].y
      );

      if (distSq <= threshold * threshold) {
        return true;
      }
    }
    return false;
  }

  // For rotated path, transform the test point
  const center = getPathCenter(path);

  // Apply inverse rotation to the point
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);

  const dx = point.x - center.x;
  const dy = point.y - center.y;

  const testPoint = {
    x: center.x + (dx * cos - dy * sin),
    y: center.y + (dx * sin + dy * cos),
  };

  // Transform all path points
  const transformedPoints = path.points.map(pathPoint =>
    rotatePoint(pathPoint, center, -rotation)
  );

  // Check against the transformed path
  for (let i = 1; i < transformedPoints.length; i++) {
    const distSq = distanceSqFromPointToSegment(
      testPoint.x,
      testPoint.y,
      transformedPoints[i - 1].x,
      transformedPoints[i - 1].y,
      transformedPoints[i].x,
      transformedPoints[i].y
    );

    if (distSq <= threshold * threshold) {
      return true;
    }
  }

  return false;
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
      return isPointNearRectangle(
        point,
        elementData as CanvasElements.Rectangle,
        rotation,
        threshold + (elementData as CanvasElements.Rectangle).strokeWidth / 2
      );

    case Tools.TRIANGLE:
      // If triangle is stored as Path (new format)
      if (
        'points' in elementData &&
        (elementData as CanvasElements.Path).closed
      ) {
        return isPointNearPath(
          point,
          elementData as CanvasElements.Path,
          rotation,
          threshold
        );
      }
      // Otherwise use triangle hit detection
      return isPointNearTriangle(
        point,
        elementData as any, // Handle both Path and Triangle formats
        rotation,
        threshold
      );

    case Tools.CIRCLE:
      return isPointNearCircle(
        point,
        elementData as CanvasElements.Circle,
        rotation,
        threshold + (elementData as CanvasElements.Circle).strokeWidth / 2
      );

    case Tools.STAR:
      return isPointNearStar(
        point,
        elementData as CanvasElements.Star,
        rotation,
        threshold + (elementData as CanvasElements.Star).strokeWidth / 2
      );

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
