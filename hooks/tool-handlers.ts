import { CanvasElements } from '@/constants/CanvasElement';
import { ToolData, Tools } from '@/constants/Tools';
import { CanvasElement } from '@/hooks/useCanvas'; // Assuming useCanvas exports this type
import { cloneDeep } from 'lodash';

type Point = { x: number; y: number };

// Helper function to calculate distance between two points
const distance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Helper function to get the unrotated top-left point
const getUnrotatedTopLeft = (
  rotatedTopLeft: Point,
  width: number,
  height: number,
  rotation: number
): Point => {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  // Center of the unrotated rectangle if its top-left was (0,0) would be (width/2, height/2)
  // The offset from the center to the top-left is (-width/2, -height/2)
  // Rotated offset:
  // offsetX = (-width/2)*cos - (-height/2)*sin
  // offsetY = (-width/2)*sin + (-height/2)*cos
  // The rotatedTopLeft is Center_rotated + RotatedOffset
  // Center_rotated = rotatedTopLeft - RotatedOffset
  // UnrotatedTopLeft = Center_rotated - UnrotatedOffset (where UnrotatedOffset is (-width/2, -height/2))
  // P.x = s_world_tl.x - newWidth/2 + (newWidth/2)*cos(rot) - (newHeight/2)*sin(rot)
  // P.y = s_world_tl.y - newHeight/2 + (newWidth/2)*sin(rot) + (newHeight/2)*cos(rot)
  // This formula seems to be for finding the original center from a rotated point, let's re-derive.

  // Let P_unrotated_tl be the point we are looking for.
  // Center_unrotated = { P_unrotated_tl.x + width/2, P_unrotated_tl.y + height/2 }
  // rotatedTopLeft is P_unrotated_tl rotated around Center_unrotated by 'rotation'.
  // To reverse:
  // 1. Translate rotatedTopLeft so Center_unrotated is at origin:
  //    temp_rtl_x = rotatedTopLeft.x - Center_unrotated.x
  //    temp_rtl_y = rotatedTopLeft.y - Center_unrotated.y
  // 2. Rotate temp_rtl by -rotation:
  //    unrotated_relative_tl_x = temp_rtl_x * cos(-rotation) - temp_rtl_y * sin(-rotation)
  //    unrotated_relative_tl_y = temp_rtl_x * sin(-rotation) + temp_rtl_y * cos(-rotation)
  // This unrotated_relative_tl should be P_unrotated_tl - Center_unrotated.
  // So, P_unrotated_tl.x = unrotated_relative_tl_x + Center_unrotated.x
  // P_unrotated_tl.y = unrotated_relative_tl_y + Center_unrotated.y

  // This is simpler: the top-left point of the unrotated rectangle is (X, Y).
  // Its center is (X + width/2, Y + height/2).
  // The rotated top-left point (rotatedTopLeft.x, rotatedTopLeft.y) is obtained by:
  // rotatedTopLeft.x = (X + width/2) + (X - (X + width/2)) * cos(rotation) - (Y - (Y + height/2)) * sin(rotation)
  // rotatedTopLeft.x = (X + width/2) + (-width/2) * cos - (-height/2) * sin
  // rotatedTopLeft.y = (Y + height/2) + (-width/2) * sin + (-height/2) * cos
  // Solving for X:
  // X = rotatedTopLeft.x - width/2 - (-width/2 * cos - (-height/2) * sin)
  // X = rotatedTopLeft.x - width/2 + (width/2 * cos) + (height/2 * sin) -> Incorrect derivation somewhere
  // Correct:
  const unrotatedOffsetX = -width / 2;
  const unrotatedOffsetY = -height / 2;

  // Calculate the center based on the rotatedTopLeft and the known offset from center to top-left if it were rotated
  const centerX =
    rotatedTopLeft.x - (unrotatedOffsetX * cos - unrotatedOffsetY * sin);
  const centerY =
    rotatedTopLeft.y - (unrotatedOffsetX * sin + unrotatedOffsetY * cos);

  // The unrotated top-left is then this center plus the unrotated offset
  return {
    x: centerX + unrotatedOffsetX,
    y: centerY + unrotatedOffsetY,
  };
};

// Helper function to scale a point relative to an origin
const scalePoint = (
  point: Point,
  origin: Point,
  scaleX: number,
  scaleY: number,
  rotation: number = 0
): Point => {
  if (rotation === 0) {
    return {
      x: origin.x + (point.x - origin.x) * scaleX,
      y: origin.y + (point.y - origin.y) * scaleY,
    };
  }

  // For rotated scaling, we need to:
  // 1. Translate so origin is at (0,0)
  // 2. Rotate by -rotation to align with axes
  // 3. Scale
  // 4. Rotate back by rotation
  // 5. Translate back

  // Step 1: Translate
  let x = point.x - origin.x;
  let y = point.y - origin.y;

  // Step 2: Rotate to align with axes
  const cos = Math.cos(-rotation);
  const sin = Math.sin(-rotation);
  const xRot = x * cos - y * sin;
  const yRot = x * sin + y * cos;

  // Step 3: Scale
  const xScaled = xRot * scaleX;
  const yScaled = yRot * scaleY;

  // Step 4 & 5: Rotate back and translate
  const cosBack = Math.cos(rotation);
  const sinBack = Math.sin(rotation);

  return {
    x: origin.x + (xScaled * cosBack - yScaled * sinBack),
    y: origin.y + (xScaled * sinBack + yScaled * cosBack),
  };
};

// Helper to rotate a point around an origin
const rotatePoint = (point: Point, origin: Point, angle: number): Point => {
  // Translate point to origin
  const translatedX = point.x - origin.x;
  const translatedY = point.y - origin.y;

  // Rotate
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rotatedX = translatedX * cos - translatedY * sin;
  const rotatedY = translatedX * sin + translatedY * cos;

  // Translate back
  return {
    x: rotatedX + origin.x,
    y: rotatedY + origin.y,
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
    origin: Point,
    rotation?: number
  ) => CanvasElement;
  rotateElement?: (
    element: CanvasElement,
    centerX: number,
    centerY: number,
    angleDiff: number
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
    scaleElement: (element, scaleX, scaleY, origin, rotation = 0) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(p =>
        scalePoint(p, origin, scaleX, scaleY, rotation)
      );
      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(p =>
        rotatePoint(p, { x: centerX, y: centerY }, angleDiff)
      );
      // DO NOT set newElement.rotation here, as points are already transformed to world space.
      // newElement.rotation should remain 0 or undefined for paths handled this way.
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
    scaleElement: (element, scaleX, scaleY, origin, rotation = 0) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(p =>
        scalePoint(p, origin, scaleX, scaleY, rotation)
      );
      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;
      path.points = path.points.map(p =>
        rotatePoint(p, { x: centerX, y: centerY }, angleDiff)
      );
      // DO NOT set newElement.rotation here.
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
    rotateElement: element => element, // Eraser doesn't need rotation
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
    scaleElement: (element, scaleX, scaleY, origin, rotation = 0) => {
      const newElement = cloneDeep(element);
      const line = newElement.element as CanvasElements.Line;
      line.startPoint = scalePoint(
        line.startPoint,
        origin,
        scaleX,
        scaleY,
        rotation
      );
      line.endPoint = scalePoint(
        line.endPoint,
        origin,
        scaleX,
        scaleY,
        rotation
      );
      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const line = newElement.element as CanvasElements.Line;
      line.startPoint = rotatePoint(
        line.startPoint,
        { x: centerX, y: centerY },
        angleDiff
      );
      line.endPoint = rotatePoint(
        line.endPoint,
        { x: centerX, y: centerY },
        angleDiff
      );
      // DO NOT set newElement.rotation here.
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
    scaleElement: (element, scaleX, scaleY, origin, selectionRotation = 0) => {
      const newElement = cloneDeep(element);
      const rect = newElement.element as CanvasElements.Rectangle;
      const elementRotation = newElement.rotation || 0;

      // 1. Get current corners in local unrotated space
      const local_tl = { x: rect.point.x, y: rect.point.y };
      const local_tr = { x: rect.point.x + rect.width, y: rect.point.y };
      const local_bl = { x: rect.point.x, y: rect.point.y + rect.height };
      const local_center = {
        x: rect.point.x + rect.width / 2,
        y: rect.point.y + rect.height / 2,
      };

      // 2. Transform to world space using element's intrinsic rotation
      const world_tl = rotatePoint(local_tl, local_center, elementRotation);
      const world_tr = rotatePoint(local_tr, local_center, elementRotation);
      const world_bl = rotatePoint(local_bl, local_center, elementRotation);

      // 3. Scale these world corners using the selection's scaling logic
      const s_world_tl = scalePoint(
        world_tl,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_tr = scalePoint(
        world_tr,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_bl = scalePoint(
        world_bl,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );

      // 4. Determine new properties from scaled world corners
      const newElementRotationAngle = Math.atan2(
        s_world_tr.y - s_world_tl.y,
        s_world_tr.x - s_world_tl.x
      );
      const newWidth = distance(s_world_tl, s_world_tr);
      const newHeight = distance(s_world_tl, s_world_bl);

      // Ensure width and height are not negative (can happen with extreme scaling/flipping)
      // Though scaleX/scaleY from useCanvas are usually positive due to handle logic
      const finalNewWidth = Math.abs(newWidth);
      const finalNewHeight = Math.abs(newHeight);

      newElement.rotation = newElementRotationAngle;
      rect.width = finalNewWidth;
      rect.height = finalNewHeight;
      rect.point = getUnrotatedTopLeft(
        s_world_tl,
        finalNewWidth,
        finalNewHeight,
        newElementRotationAngle
      );

      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const rect = newElement.element as CanvasElements.Rectangle;

      // Calculate the center of the rectangle
      const rectCenterX = rect.point.x + rect.width / 2;
      const rectCenterY = rect.point.y + rect.height / 2;

      // Rotate the rectangle's center around the selection center
      const newCenter = rotatePoint(
        { x: rectCenterX, y: rectCenterY },
        { x: centerX, y: centerY },
        angleDiff
      );

      // Calculate the new top-left position based on the rotated center
      rect.point = {
        x: newCenter.x - rect.width / 2,
        y: newCenter.y - rect.height / 2,
      };

      // Store the rotation
      newElement.rotation = (newElement.rotation || 0) + angleDiff;
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
    scaleElement: (element, scaleX, scaleY, origin, selectionRotation = 0) => {
      const newElement = cloneDeep(element);
      const circle = newElement.element as CanvasElements.Circle;
      const elementRotation = newElement.rotation || 0;

      // 1. Define key points in local unrotated space
      const local_center = { x: circle.center.x, y: circle.center.y };
      const local_p_radiusX = {
        x: circle.center.x + circle.radiusX,
        y: circle.center.y,
      };
      const local_p_radiusY = {
        x: circle.center.x,
        y: circle.center.y - circle.radiusY,
      }; // Using -Y for "up"

      // 2. Transform to world space using element's intrinsic rotation
      // For circle, center is the pivot. If elementRotation is 0, world points are same as local.
      const world_center = rotatePoint(
        local_center,
        local_center,
        elementRotation
      ); // Stays same
      const world_p_radiusX = rotatePoint(
        local_p_radiusX,
        local_center,
        elementRotation
      );
      const world_p_radiusY = rotatePoint(
        local_p_radiusY,
        local_center,
        elementRotation
      );

      // 3. Scale these world points
      const s_world_center = scalePoint(
        world_center,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_p_radiusX = scalePoint(
        world_p_radiusX,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_p_radiusY = scalePoint(
        world_p_radiusY,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );

      // 4. Update element properties
      circle.center = s_world_center;
      circle.radiusX = distance(s_world_center, s_world_p_radiusX);
      circle.radiusY = distance(s_world_center, s_world_p_radiusY);

      // Calculate new rotation based on the direction of the scaled radiusX vector
      const dx = s_world_p_radiusX.x - s_world_center.x;
      const dy = s_world_p_radiusX.y - s_world_center.y;
      newElement.rotation = Math.atan2(dy, dx);

      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const circle = newElement.element as CanvasElements.Circle;

      // Rotate the center of the circle around the selection center
      circle.center = rotatePoint(
        circle.center,
        { x: centerX, y: centerY },
        angleDiff
      );

      // Always store the rotation angle for ALL circles/ovals regardless of whether
      // radiusX equals radiusY or not. This ensures all ovals rotate properly.
      newElement.rotation = (newElement.rotation || 0) + angleDiff;

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
        // Store as Path internally for consistent handling
        points: [
          { x, y }, // First point (anchor)
          { x, y }, // Second point (will be updated)
          { x, y }, // Third point (will be updated)
        ],
        strokeWidth,
        strokeColor: color,
        fillColor: undefined, // Optional fill
        closed: true, // Mark as closed path (triangle)
      } as CanvasElements.Path,
      tool: Tools.TRIANGLE, // Still identify as Triangle tool
    }),

    updateElement: (element, x, y, isShiftDown) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;

      // First point is anchor
      const startPoint = path.points[0];
      let currentX = x;
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
        angle = Math.atan2(dy, dx);

        // Calculate points for an equilateral triangle based on (potentially snapped) currentX, currentY
        const sideLength = Math.sqrt(dx * dx + dy * dy);

        if (sideLength === 0) {
          // Avoid division by zero if start and end points are the same
          path.points[1] = { ...startPoint };
          path.points[2] = { ...startPoint };
          return newElement;
        }

        // Point 2 is the (potentially snapped) current cursor position
        path.points[1] = { x: currentX, y: currentY };

        // Calculate Point 3 for equilateral triangle
        const height = sideLength * (Math.sqrt(3) / 2);
        const midX = (startPoint.x + currentX) / 2;
        const midY = (startPoint.y + currentY) / 2;
        const perpendicularAngle = angle - Math.PI / 2;

        path.points[2] = {
          x: midX + height * Math.cos(perpendicularAngle),
          y: midY + height * Math.sin(perpendicularAngle),
        };
      } else {
        // Original logic: Isosceles triangle
        path.points[1] = { x: currentX, y: startPoint.y };
        path.points[2] = {
          x: startPoint.x + (currentX - startPoint.x) / 2,
          y: currentY,
        };
      }

      return newElement;
    },

    moveElement: (element, deltaX, deltaY) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;

      // Move all points by delta
      path.points = path.points.map(point => ({
        x: point.x + deltaX,
        y: point.y + deltaY,
      }));

      return newElement;
    },

    scaleElement: (element, scaleX, scaleY, origin, rotation = 0) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;

      // Scale all points
      path.points = path.points.map(p =>
        scalePoint(p, origin, scaleX, scaleY, rotation)
      );

      return newElement;
    },

    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const path = newElement.element as CanvasElements.Path;

      // Rotate all points
      path.points = path.points.map(p =>
        rotatePoint(p, { x: centerX, y: centerY }, angleDiff)
      );

      // DO NOT set newElement.rotation here if points are directly transformed.
      return newElement;
    },

    finalizeElement: element => {
      // Validate the triangle
      const path = element.element as CanvasElements.Path;
      if (path.points.length < 3) {
        return null;
      }

      // Check if the points form a significant triangle
      const [p1, p2, p3] = path.points;
      const area = Math.abs(
        (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2
      );

      if (area < 10) {
        // Minimum area threshold
        return null;
      }

      return element;
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
    scaleElement: (element, scaleX, scaleY, origin, selectionRotation = 0) => {
      const newElement = cloneDeep(element);
      const star = newElement.element as CanvasElements.Star;
      const elementRotation = newElement.rotation || 0;

      // 1. Define key points in local unrotated space
      const local_center = { x: star.point.x, y: star.point.y };
      // A primary spike tip, typically pointing upwards (-Y) in local unrotated frame
      const local_p_tip = { x: star.point.x, y: star.point.y - star.radius };

      // 2. Transform to world space
      const world_center = rotatePoint(
        local_center,
        local_center,
        elementRotation
      ); // Stays same
      const world_p_tip = rotatePoint(
        local_p_tip,
        local_center,
        elementRotation
      );

      // 3. Scale these world points
      const s_world_center = scalePoint(
        world_center,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_p_tip = scalePoint(
        world_p_tip,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );

      // 4. Update element properties
      star.point = s_world_center;
      star.radius = distance(s_world_center, s_world_p_tip);

      const dx = s_world_p_tip.x - s_world_center.x;
      const dy = s_world_p_tip.y - s_world_center.y;
      // Add Math.PI / 2 because original tip was along -Y axis (angle -PI/2 or 3PI/2)
      // atan2 gives angle relative to +X axis.
      newElement.rotation = Math.atan2(dy, dx) + Math.PI / 2;

      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const star = newElement.element as CanvasElements.Star;
      star.point = rotatePoint(
        star.point,
        { x: centerX, y: centerY },
        angleDiff
      );
      newElement.rotation = (newElement.rotation || 0) + angleDiff;
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
    scaleElement: (element, scaleX, scaleY, origin, rotation = 0) => {
      const newElement = cloneDeep(element);
      const text = newElement.element as CanvasElements.Text;
      const elementRotation = newElement.rotation || 0;

      // Approximate width for orientation
      const approx_char_width = text.fontSize * 0.6;
      const original_approx_width =
        text.text.length > 0
          ? text.text.length * approx_char_width
          : text.fontSize;

      // 1. Define key points in local unrotated space (anchor and a point for orientation)
      const local_anchor = { x: text.point.x, y: text.point.y };
      const local_orient_pt = {
        x: text.point.x + original_approx_width,
        y: text.point.y,
      };

      // 2. Transform to world space (rotation is around text.point)
      const world_anchor = rotatePoint(
        local_anchor,
        local_anchor,
        elementRotation
      ); // Stays same
      const world_orient_pt = rotatePoint(
        local_orient_pt,
        local_anchor,
        elementRotation
      );

      // 3. Scale these world points
      const s_world_anchor = scalePoint(
        world_anchor,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_orient_pt = scalePoint(
        world_orient_pt,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );

      // 4. Update element properties
      text.point = s_world_anchor;

      const new_approx_width = distance(s_world_anchor, s_world_orient_pt);
      if (original_approx_width > 0.1) {
        // Avoid division by zero or tiny numbers
        text.fontSize *= new_approx_width / original_approx_width;
      } else if (new_approx_width > 0.1) {
        // If original was tiny but new is not, base on average scale
        text.fontSize *= Math.sqrt(Math.abs(scaleX * scaleY));
      }
      // Ensure font size is reasonable
      text.fontSize = Math.max(1, text.fontSize);

      const dx = s_world_orient_pt.x - s_world_anchor.x;
      const dy = s_world_orient_pt.y - s_world_anchor.y;
      newElement.rotation = Math.atan2(dy, dx);

      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const text = newElement.element as CanvasElements.Text;
      text.point = rotatePoint(
        text.point,
        { x: centerX, y: centerY },
        angleDiff
      );
      newElement.rotation = (newElement.rotation || 0) + angleDiff;
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
    scaleElement: (element, scaleX, scaleY, origin, selectionRotation = 0) => {
      const newElement = cloneDeep(element);
      const img = newElement.element as CanvasElements.Image;
      const elementRotation = newElement.rotation || 0;

      // 1. Get current corners in local unrotated space
      const local_tl = { x: img.point.x, y: img.point.y };
      const local_tr = { x: img.point.x + img.width, y: img.point.y };
      const local_bl = { x: img.point.x, y: img.point.y + img.height };
      const local_center = {
        x: img.point.x + img.width / 2,
        y: img.point.y + img.height / 2,
      };

      // 2. Transform to world space
      const world_tl = rotatePoint(local_tl, local_center, elementRotation);
      const world_tr = rotatePoint(local_tr, local_center, elementRotation);
      const world_bl = rotatePoint(local_bl, local_center, elementRotation);

      // 3. Scale these world corners
      const s_world_tl = scalePoint(
        world_tl,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_tr = scalePoint(
        world_tr,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );
      const s_world_bl = scalePoint(
        world_bl,
        origin,
        scaleX,
        scaleY,
        selectionRotation
      );

      // 4. Determine new properties
      const newElementRotationAngle = Math.atan2(
        s_world_tr.y - s_world_tl.y,
        s_world_tr.x - s_world_tl.x
      );
      const newWidth = distance(s_world_tl, s_world_tr);
      const newHeight = distance(s_world_tl, s_world_bl);

      const finalNewWidth = Math.abs(newWidth);
      const finalNewHeight = Math.abs(newHeight);

      newElement.rotation = newElementRotationAngle;
      img.width = finalNewWidth;
      img.height = finalNewHeight;
      img.point = getUnrotatedTopLeft(
        s_world_tl,
        finalNewWidth,
        finalNewHeight,
        newElementRotationAngle
      );

      return newElement;
    },
    rotateElement: (element, centerX, centerY, angleDiff) => {
      const newElement = cloneDeep(element);
      const img = newElement.element as CanvasElements.Image;
      img.point = rotatePoint(img.point, { x: centerX, y: centerY }, angleDiff);
      newElement.rotation = (newElement.rotation || 0) + angleDiff;
      return newElement;
    },
    finalizeElement: element => element, // No finalization typically needed
  },
  // Tools that don't create persistent elements
  [Tools.SELECT]: {},
  [Tools.PAN]: {},
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
