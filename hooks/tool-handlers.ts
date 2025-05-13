import { CanvasElements } from '@/constants/CanvasElement';
import { ToolData, Tools } from '@/constants/Tools';
import { CanvasElement } from '@/hooks/useCanvas'; // Assuming useCanvas exports this type
import { cloneDeep } from 'lodash';

type Point = { x: number; y: number };

// Helper function to scale a point relative to an origin
const scalePoint = (
  point: Point,
  origin: Point,
  scaleX: number,
  scaleY: number
): Point => {
  return {
    x: origin.x + (point.x - origin.x) * scaleX,
    y: origin.y + (point.y - origin.y) * scaleY,
  };
};

interface ToolHandler {
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
    y: number,
    isShiftDown: boolean
  ) => CanvasElement;
  moveElement?: (
    element: CanvasElement,
    deltaX: number,
    deltaY: number
  ) => CanvasElement;
  scaleElement?: (
    element: CanvasElement,
    scaleX: number,
    scaleY: number,
    origin: Point
  ) => CanvasElement;
  // Optional method to finalize an element after drawing/modification
  // Can return null to indicate the element should be discarded (e.g., zero size)
  finalizeElement?: (element: CanvasElement) => CanvasElement | null;
}

const snapAngle = (angle: number): number => {
  const snapIncrement = Math.PI / 4; // 45 degrees
  return Math.round(angle / snapIncrement) * snapIncrement;
};

const toolHandlers: Record<Tools, ToolHandler> = {
  [Tools.PEN]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        points: [{ x, y }],
        strokeWidth,
        strokeColor: color,
        capStyle: 'round', // Default for pen
        blendMode: 'srcOver', // Default blend mode
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
      path.points = path.points.map(p => ({
        x: p.x + deltaX,
        y: p.y + deltaY,
      }));
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY, origin) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(p => scalePoint(p, origin, scaleX, scaleY));
      // Optionally scale strokeWidth? Depends on desired behavior.
      // path.strokeWidth *= Math.sqrt(Math.abs(scaleX * scaleY));
      return newElement;
    },
    finalizeElement: element => {
      const path = element.element as CanvasElements.Path;
      // Discard paths with less than 2 points (just a dot)
      if (path.points.length < 2) {
        return null;
      }
      // Add path simplification logic here if desired (e.g., Ramer-Douglas-Peucker)
      return element;
    },
  },
  [Tools.HIGHLIGHTER]: {
    initElement: (x, y, strokeWidth, color, generateId) => {
      const toolData = ToolData[Tools.HIGHLIGHTER];
      return {
        id: generateId(),
        element: {
          points: [{ x, y }],
          strokeWidth: toolData.sizeTransform(strokeWidth),
          strokeColor: toolData.colorTransform(color),
          capStyle: toolData.cap,
          blendMode: toolData.blendMode,
        } as CanvasElements.Path,
        tool: Tools.HIGHLIGHTER,
      };
    },
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points.push({ x, y });
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(p => ({
        x: p.x + deltaX,
        y: p.y + deltaY,
      }));
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY, origin) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(p => scalePoint(p, origin, scaleX, scaleY));
      // path.strokeWidth *= Math.sqrt(Math.abs(scaleX * scaleY)); // Scale stroke?
      return newElement;
    },
    finalizeElement: element => {
      const path = element.element as CanvasElements.Path;
      if (path.points.length < 2) {
        return null;
      }
      return element;
    },
  },
  [Tools.ERASER]: {
    // Eraser might not create visual elements itself, but could be represented
    // as a path for history/redo purposes if needed.
    // If it only modifies state directly, these might not be used.
    initElement: (x, y, strokeWidth, color, generateId) => {
      const toolData = ToolData[Tools.ERASER];
      return {
        id: generateId(), // ID might be useful for tracking the erase operation
        element: {
          points: [{ x, y }],
          strokeWidth: toolData.sizeTransform(strokeWidth),
          // Color/blendMode might not be relevant for the eraser path itself
          strokeColor: 'rgba(0,0,0,0)', // Invisible
          capStyle: toolData.cap,
          blendMode: toolData.blendMode, // Usually 'destination-out'
        } as CanvasElements.Path,
        tool: Tools.ERASER,
      };
    },
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points.push({ x, y });
      return newElement;
    },
    // Moving/Scaling an eraser path doesn't make sense in typical usage
    moveElement: element => element,
    scaleElement: element => element,
    finalizeElement: element => {
      // An eraser path itself might always be considered valid if > 1 point
      const path = element.element as CanvasElements.Path;
      if (path.points.length < 2) {
        return null;
      }
      return element; // Or return null if eraser paths shouldn't persist
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
    updateElement: (element, x, y, isShiftDown) => {
      const newElement = cloneDeep(element);
      const line = newElement.element as CanvasElements.Line;
      // Access startPoint from the line object
      const startPoint = line.startPoint;

      if (isShiftDown) {
        const dx = x - startPoint.x;
        const dy = y - startPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const originalAngle = Math.atan2(dy, dx);
        const snappedAngle = snapAngle(originalAngle);
        line.endPoint = {
          x: startPoint.x + distance * Math.cos(snappedAngle),
          y: startPoint.y + distance * Math.sin(snappedAngle),
        };
      } else {
        line.endPoint = { x, y };
      }
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
    scaleElement: (element, scaleX, scaleY, origin) => {
      const newElement = cloneDeep(element);
      const line = newElement.element as CanvasElements.Line;
      line.startPoint = scalePoint(line.startPoint, origin, scaleX, scaleY);
      line.endPoint = scalePoint(line.endPoint, origin, scaleX, scaleY);
      // line.strokeWidth *= Math.sqrt(Math.abs(scaleX * scaleY)); // Scale stroke?
      return newElement;
    },
    finalizeElement: element => {
      // Discard zero-length lines
      const line = element.element as CanvasElements.Line;
      if (
        line.startPoint.x === line.endPoint.x &&
        line.startPoint.y === line.endPoint.y
      ) {
        return null;
      }
      return element;
    },
  },
  [Tools.RECTANGLE]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        point: { x, y }, // Top-left corner
        width: 0,
        height: 0,
        strokeWidth,
        strokeColor: color,
        // Add fill properties if needed
        // fillColor: 'rgba(0,0,0,0)',
      } as CanvasElements.Rectangle,
      tool: Tools.RECTANGLE,
    }),
    updateElement: (element, x, y, isShiftDown) => {
      const newElement = cloneDeep(element);
      const rect = newElement.element as CanvasElements.Rectangle;
      const startPoint = rect.point;
      const dx = x - startPoint.x;
      const dy = y - startPoint.y;

      if (isShiftDown) {
        const maxDim = Math.max(Math.abs(dx), Math.abs(dy));
        rect.width = Math.sign(dx || 1) * maxDim; // Use sign(dx || 1) to handle dx=0
        rect.height = Math.sign(dy || 1) * maxDim; // Use sign(dy || 1) to handle dy=0
      } else {
        rect.width = dx;
        rect.height = dy;
      }
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const rect = newElement.element as CanvasElements.Rectangle;
      rect.point = { x: rect.point.x + deltaX, y: rect.point.y + deltaY };
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY, origin) => {
      const newElement = cloneDeep(element);
      const rect = newElement.element as CanvasElements.Rectangle;
      // Scale top-left and bottom-right corners relative to origin
      const initialTopLeft = { x: rect.point.x, y: rect.point.y };
      const initialBottomRight = {
        x: rect.point.x + rect.width,
        y: rect.point.y + rect.height,
      };
      const newTopLeft = scalePoint(initialTopLeft, origin, scaleX, scaleY);
      const newBottomRight = scalePoint(
        initialBottomRight,
        origin,
        scaleX,
        scaleY
      );
      // Recalculate top-left, width, and height based on scaled corners
      rect.point.x = Math.min(newTopLeft.x, newBottomRight.x);
      rect.point.y = Math.min(newTopLeft.y, newBottomRight.y);
      rect.width = Math.abs(newTopLeft.x - newBottomRight.x);
      rect.height = Math.abs(newTopLeft.y - newBottomRight.y);
      // rect.strokeWidth *= Math.sqrt(Math.abs(scaleX * scaleY)); // Scale stroke?
      return newElement;
    },
    finalizeElement: element => {
      const rect = element.element as CanvasElements.Rectangle;
      // Discard zero-size rectangles
      if (Math.abs(rect.width) < 1 && Math.abs(rect.height) < 1) {
        return null;
      }
      // Normalize rectangle (positive width/height, adjust point)
      if (rect.width < 0) {
        rect.point.x += rect.width;
        rect.width = Math.abs(rect.width);
      }
      if (rect.height < 0) {
        rect.point.y += rect.height;
        rect.height = Math.abs(rect.height);
      }
      return element;
    },
  },
  [Tools.CIRCLE]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        center: { x, y },
        radiusX: 0,
        radiusY: 0,
        strokeWidth,
        strokeColor: color,
      } as CanvasElements.Circle,
      tool: Tools.CIRCLE,
    }),
    updateElement: (element, x, y, isShiftDown) => {
      const newElement = cloneDeep(element);
      const circle = newElement.element as CanvasElements.Circle;

      // Calculate dx and dy from center point to current mouse position
      const dx = Math.abs(x - circle.center.x);
      const dy = Math.abs(y - circle.center.y);

      if (isShiftDown) {
        // When shift is pressed, create a perfect circle (both radiuses equal)
        const radius = Math.max(dx, dy);
        circle.radiusX = radius;
        circle.radiusY = radius;
        console.log('Circle with Shift:', radius); // Debug
      } else {
        // Default: create an oval with independent radiuses
        circle.radiusX = dx;
        circle.radiusY = dy;
        console.log('Oval (no shift):', dx, dy); // Debug
      }

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
    scaleElement: (element, scaleX, scaleY, origin) => {
      const newElement = cloneDeep(element);
      const circle = newElement.element as CanvasElements.Circle;
      circle.center = scalePoint(circle.center, origin, scaleX, scaleY);

      // Scale both radiuses independently to maintain oval shapes
      circle.radiusX *= Math.abs(scaleX);
      circle.radiusY *= Math.abs(scaleY);

      return newElement;
    },
    finalizeElement: element => {
      const circle = element.element as CanvasElements.Circle;
      // Discard tiny circles/ovals
      if (circle.radiusX < 1 && circle.radiusY < 1) {
        return null;
      }
      return element;
    },
  },
  [Tools.TRIANGLE]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        point1: { x, y }, // Anchor point
        point2: { x, y }, // Second point (defines base width)
        point3: { x, y }, // Third point (defines height/apex)
        strokeWidth,
        strokeColor: color,
        // fillColor: 'rgba(0,0,0,0)',
      } as CanvasElements.Triangle,
      tool: Tools.TRIANGLE,
    }),
    updateElement: (element, x, y, isShiftDown) => {
      // Add isShiftDown
      const newElement = cloneDeep(element);
      const triangle = newElement.element as CanvasElements.Triangle;
      const startPoint = triangle.point1; // Alias for clarity

      let currentX = x; // Use temporary variables for potential snapping
      let currentY = y;

      if (isShiftDown) {
        // --- Axis Snapping Logic ---
        let dx = currentX - startPoint.x;
        let dy = currentY - startPoint.y;
        let angle = Math.atan2(dy, dx);
        const snapThreshold = Math.PI / 36; // ~5 degrees threshold for snapping

        // Normalize angle to be between 0 and 2*PI for easier comparison
        if (angle < 0) {
          angle += 2 * Math.PI;
        }

        // Check for snapping near horizontal axis (0 or PI)
        if (
          Math.abs(angle) < snapThreshold ||
          Math.abs(angle - Math.PI) < snapThreshold ||
          Math.abs(angle - 2 * Math.PI) < snapThreshold
        ) {
          currentY = startPoint.y; // Snap vertically
        }
        // Check for snapping near vertical axis (PI/2 or 3*PI/2)
        else if (
          Math.abs(angle - Math.PI / 2) < snapThreshold ||
          Math.abs(angle - (3 * Math.PI) / 2) < snapThreshold
        ) {
          currentX = startPoint.x; // Snap horizontally
        }

        // Recalculate dx, dy, and angle after potential snapping
        dx = currentX - startPoint.x;
        dy = currentY - startPoint.y;
        angle = Math.atan2(dy, dx); // Recalculate angle based on snapped coordinates
        // --- End Axis Snapping ---

        // Calculate points for an equilateral triangle based on (potentially snapped) currentX, currentY
        const sideLength = Math.sqrt(dx * dx + dy * dy);

        if (sideLength === 0) {
          // Avoid division by zero if start and end points are the same
          triangle.point2 = { ...startPoint };
          triangle.point3 = { ...startPoint };
          return newElement;
        }

        // Point 2 is the (potentially snapped) current cursor position
        triangle.point2 = { x: currentX, y: currentY };

        // Calculate Point 3 for equilateral triangle
        const height = sideLength * (Math.sqrt(3) / 2);
        const midX = (startPoint.x + currentX) / 2;
        const midY = (startPoint.y + currentY) / 2;
        const perpendicularAngle = angle - Math.PI / 2;

        triangle.point3 = {
          x: midX + height * Math.cos(perpendicularAngle),
          y: midY + height * Math.sin(perpendicularAngle),
        };
      } else {
        // Original logic: Isosceles triangle
        triangle.point2 = { x: currentX, y: startPoint.y };
        triangle.point3 = {
          x: startPoint.x + (currentX - startPoint.x) / 2,
          y: currentY,
        };
      }
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY, origin) => {
      const newElement = cloneDeep(element);
      const triangle = newElement.element as CanvasElements.Triangle;
      triangle.point1 = scalePoint(triangle.point1, origin, scaleX, scaleY);
      triangle.point2 = scalePoint(triangle.point2, origin, scaleX, scaleY);
      triangle.point3 = scalePoint(triangle.point3, origin, scaleX, scaleY);
      // triangle.strokeWidth *= Math.sqrt(Math.abs(scaleX * scaleY)); // Scale stroke?
      return newElement;
    },
    finalizeElement: element => {
      // Add validation if needed (e.g., check if points are collinear)
      return element;
    },
    moveElement: (element, deltaX, deltaY) => {
      // Create a deep clone first to avoid reference issues
      const newElement = cloneDeep(element);
      const triangle = newElement.element as CanvasElements.Triangle;

      // Explicitly create new point objects for each point
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

      // Add debug log to verify the movement
      console.log('Moving Triangle:', {
        before: element.element,
        after: triangle,
        delta: { deltaX, deltaY },
      });

      return newElement;
    },
  },
  [Tools.STAR]: {
    initElement: (x, y, strokeWidth, color, generateId) => ({
      id: generateId(),
      element: {
        point: { x, y }, // Center point
        radius: 0,
        spikes: 5, // Default number of spikes
        strokeWidth,
        strokeColor: color,
        // fillColor: 'rgba(0,0,0,0)',
      } as CanvasElements.Star,
      tool: Tools.STAR,
    }),
    updateElement: (element, x, y) => {
      const newElement = cloneDeep(element);
      const star = newElement.element as CanvasElements.Star;
      // Radius based on distance from center
      star.radius = Math.sqrt(
        Math.pow(x - star.point.x, 2) + Math.pow(y - star.point.y, 2)
      );
      return newElement;
    },
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const star = newElement.element as CanvasElements.Star;
      star.point = { x: star.point.x + deltaX, y: star.point.y + deltaY };
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY, origin) => {
      const newElement = cloneDeep(element);
      const star = newElement.element as CanvasElements.Star;
      star.point = scalePoint(star.point, origin, scaleX, scaleY);
      star.radius *= Math.sqrt(Math.abs(scaleX * scaleY));
      // star.strokeWidth *= Math.sqrt(Math.abs(scaleX * scaleY)); // Scale stroke?
      return newElement;
    },
    finalizeElement: element => {
      const star = element.element as CanvasElements.Star;
      // Discard tiny stars
      if (star.radius < 1) {
        return null;
      }
      return element;
    },
  },
  [Tools.TEXT]: {
    // Text creation might happen via a modal or separate input
    // initElement might not be used directly from canvas drag
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const text = newElement.element as CanvasElements.Text;
      text.point = { x: text.point.x + deltaX, y: text.point.y + deltaY };
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY, origin) => {
      // Scaling text involves scaling the position and font size
      const newElement = cloneDeep(element);
      const text = newElement.element as CanvasElements.Text;
      text.point = scalePoint(text.point, origin, scaleX, scaleY);
      // Scale font size based on geometric mean of scale factors
      text.fontSize *= Math.sqrt(Math.abs(scaleX * scaleY));
      return newElement;
    },
    finalizeElement: element => element, // No finalization typically needed
  },
  [Tools.IMAGE]: {
    // Image creation likely happens via file selection, not canvas drag
    // initElement might not be used directly
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const img = newElement.element as CanvasElements.Image;
      img.point = { x: img.point.x + deltaX, y: img.point.y + deltaY };
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY, origin) => {
      // Scaling an image scales its position and dimensions
      const newElement = cloneDeep(element);
      const img = newElement.element as CanvasElements.Image;
      const initialTopLeft = { x: img.point.x, y: img.point.y };
      const initialBottomRight = {
        x: img.point.x + img.width,
        y: img.point.y + img.height,
      };
      const newTopLeft = scalePoint(initialTopLeft, origin, scaleX, scaleY);
      const newBottomRight = scalePoint(
        initialBottomRight,
        origin,
        scaleX,
        scaleY
      );
      img.point.x = Math.min(newTopLeft.x, newBottomRight.x);
      img.point.y = Math.min(newTopLeft.y, newBottomRight.y);
      img.width = Math.abs(newTopLeft.x - newBottomRight.x);
      img.height = Math.abs(newTopLeft.y - newBottomRight.y);
      return newElement;
    },
    finalizeElement: element => element, // No finalization typically needed
  },
  [Tools.EMOJI]: {
    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const emoji = newElement.element as CanvasElements.Emoji;
      emoji.point = { x: emoji.point.x + deltaX, y: emoji.point.y + deltaY };
      return newElement;
    },
    scaleElement: (element, scaleX, scaleY) => {
      // Scaling an image scales its position and dimensions
      const newElement = cloneDeep(element);
      const emoji = newElement.element as CanvasElements.Emoji;
      // Change scaling by changing size
      emoji.size *= Math.sqrt(Math.abs(scaleX * scaleY));
      return newElement;
    },
    finalizeElement: element => element, // No finalization typically needed
  },
  // Tools that don't create persistent elements
  [Tools.SELECT]: {},
  [Tools.PAN]: {},
  [Tools.EYEDROPPER]: {},
};

// Helper for processing and scaling images before adding to canvas
export const processImageForCanvas = (
  imageWidth: number,
  imageHeight: number,
  canvasWidth: number,
  canvasHeight: number,
  maxImageDimension: number = 1024 // Example max dimension constraint
): { width: number; height: number } => {
  let resizeWidth = imageWidth;
  let resizeHeight = imageHeight;

  // Limit to max dimension if needed, maintaining aspect ratio
  if (resizeWidth > maxImageDimension || resizeHeight > maxImageDimension) {
    if (resizeWidth > resizeHeight) {
      resizeHeight = Math.floor(
        resizeHeight * (maxImageDimension / resizeWidth)
      );
      resizeWidth = maxImageDimension;
    } else {
      resizeWidth = Math.floor(
        resizeWidth * (maxImageDimension / resizeHeight)
      );
      resizeHeight = maxImageDimension;
    }
  }

  // Scale down further if it still exceeds canvas dimensions (e.g., fit 90%)
  const scaleToFit = 0.9;
  if (
    resizeWidth > canvasWidth * scaleToFit ||
    resizeHeight > canvasHeight * scaleToFit
  ) {
    const widthRatio = (canvasWidth * scaleToFit) / resizeWidth;
    const heightRatio = (canvasHeight * scaleToFit) / resizeHeight;
    const scaleFactor = Math.min(widthRatio, heightRatio);
    resizeWidth *= scaleFactor;
    resizeHeight *= scaleFactor;
  }

  return { width: Math.round(resizeWidth), height: Math.round(resizeHeight) };
};

export default toolHandlers;
