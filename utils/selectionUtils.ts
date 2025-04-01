import { CanvasElements } from '@/constants/CanvasElement';
import { Tools } from '@/constants/Tools';
import { CanvasElement } from '@/hooks/useCanvas';
import { Skia, TextAlign } from '@shopify/react-native-skia';

/* * This function calculates the bounding box of a given canvas element based on its type.
 * It takes the tool type and the element data as arguments and returns an object with x, y, width, and height properties.
 * The bounding box is the smallest rectangle that can contain the entire element. */

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Selection object type (copied from useCanvas to avoid circular dependency)
export type Selection = {
  ids: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  state: 'selecting' | 'selected';
};

export const calculateBoundingBox = (
  tool: Tools,
  data: CanvasElements.Any,
  fontManager?: any
): BoundingBox | null => {
  switch (tool) {
    case Tools.PEN:
    case Tools.HIGHLIGHTER:
      const { points, strokeWidth = 0 } = data as CanvasElements.Path;
      const minX = Math.min(...points.map(point => point.x));
      const minY = Math.min(...points.map(point => point.y));
      const maxX = Math.max(...points.map(point => point.x));
      const maxY = Math.max(...points.map(point => point.y));

      // Expand the bounding box by half the stroke width in all directions
      const halfStrokeWidth = strokeWidth / 2;

      return {
        x: minX - halfStrokeWidth,
        y: minY - halfStrokeWidth,
        width: maxX - minX + strokeWidth,
        height: maxY - minY + strokeWidth,
      };
    case Tools.LINE:
      const {
        startPoint,
        endPoint,
        strokeWidth: lineStrokeWidth = 0,
      } = data as CanvasElements.Line;
      const halfLineStrokeWidth = lineStrokeWidth / 2;
      return {
        x: Math.min(startPoint.x, endPoint.x) - halfLineStrokeWidth,
        y: Math.min(startPoint.y, endPoint.y) - halfLineStrokeWidth,
        width: Math.abs(startPoint.x - endPoint.x) + lineStrokeWidth,
        height: Math.abs(startPoint.y - endPoint.y) + lineStrokeWidth,
      };
    case Tools.RECTANGLE:
      const {
        point,
        width,
        height,
        strokeWidth: rectStrokeWidth = 0,
      } = data as CanvasElements.Rectangle;
      const halfRectStrokeWidth = rectStrokeWidth / 2;
      return {
        x: point.x - halfRectStrokeWidth,
        y: point.y - halfRectStrokeWidth,
        width: width + rectStrokeWidth,
        height: height + rectStrokeWidth,
      };
    case Tools.TRIANGLE:
      const {
        point1,
        point2,
        point3,
        strokeWidth: triangleStrokeWidth,
      } = data as CanvasElements.Triangle;
      const minXTriangle = Math.min(point1.x, point2.x, point3.x);
      const minYTriangle = Math.min(point1.y, point2.y, point3.y);
      const maxXTriangle = Math.max(point1.x, point2.x, point3.x);
      const maxYTriangle = Math.max(point1.y, point2.y, point3.y);
      return {
        x: minXTriangle - triangleStrokeWidth / 2,
        y: minYTriangle - triangleStrokeWidth / 2,
        width: maxXTriangle - minXTriangle + triangleStrokeWidth,
        height: maxYTriangle - minYTriangle + triangleStrokeWidth,
      };
    case Tools.CIRCLE:
      const {
        center,
        radius,
        strokeWidth: circleStrokeWidth = 0,
      } = data as CanvasElements.Circle;
      const halfCircleStrokeWidth = circleStrokeWidth / 2;
      return {
        x: center.x - radius - halfCircleStrokeWidth,
        y: center.y - radius - halfCircleStrokeWidth,
        width: radius * 2 + circleStrokeWidth,
        height: radius * 2 + circleStrokeWidth,
      };
    case Tools.STAR:
      const {
        point: pointStar,
        radius: radiusStar,
        spikes,
        strokeWidth: starStrokeWidth = 0,
      } = data as CanvasElements.Star;

      const path = Skia.Path.Make();

      const angle = (Math.PI * 2) / spikes;
      const halfAngle = angle / 2;
      const innerRadius = radiusStar / 2;
      path.moveTo(pointStar.x, pointStar.y - radiusStar);
      for (let i = 0; i < spikes; i++) {
        const x = pointStar.x + radiusStar * Math.sin(i * angle);
        const y = pointStar.y - radiusStar * Math.cos(i * angle);
        path.lineTo(x, y);
        const innerX =
          pointStar.x + innerRadius * Math.sin(i * angle + halfAngle);
        const innerY =
          pointStar.y - innerRadius * Math.cos(i * angle + halfAngle);
        path.lineTo(innerX, innerY);
      }
      path.lineTo(pointStar.x, pointStar.y - radiusStar);

      path.close();

      const bounds = path.getBounds();
      path.dispose();

      return {
        x: bounds.x - starStrokeWidth,
        y: bounds.y - starStrokeWidth,
        width: bounds.width + starStrokeWidth * 2,
        height: bounds.height + starStrokeWidth * 2,
      };
    case Tools.TEXT:
      const {
        text,
        fontSize,
        fontFamily,
        fontStyle,
        fontWeight,
        point: textPoint,
      } = data as CanvasElements.Text;

      if (!fontManager) {
        console.warn(
          'Font manager is not available. Cannot calculate bounding box for text.'
        );
        return null;
      }

      try {
        const paragraph = Skia.ParagraphBuilder.Make(
          { textAlign: TextAlign.Left },
          fontManager
        )
          .pushStyle({
            fontFamilies: [fontFamily],
            fontSize: fontSize,
            fontStyle: {
              weight: fontWeight as any,
              slant: fontStyle === 'italic' ? 1 : 0,
            },
          })
          .addText(text)
          .build();

        // Measure text accurately
        paragraph.layout(1000);
        let textWidth = paragraph.getLongestLine();
        const textHeight = paragraph.getHeight();

        // Validate width - use fallback if invalid
        if (textWidth <= 0 || !isFinite(textWidth)) {
          console.warn(
            'Invalid text width detected, using fallback measurement'
          );
          textWidth = text.length * (fontSize * 0.6);
        }

        return {
          x: textPoint.x,
          y: textPoint.y,
          width: textWidth,
          height: textHeight,
        };
      } catch (error) {
        console.error('Error measuring text:', error);
        return {
          x: textPoint.x,
          y: textPoint.y,
          width: text.length * (fontSize * 0.6),
          height: fontSize * 1.2,
        };
      }
    case Tools.IMAGE:
      const {
        point: imagePoint,
        width: imageWidth,
        height: imageHeight,
      } = data as CanvasElements.Image;
      return {
        x: imagePoint.x,
        y: imagePoint.y,
        width: imageWidth,
        height: imageHeight,
      };
    default:
      return null;
  }
};

/**
 * Finds all canvas elements that are completely within the selection box
 */
export const findElementsInSelection = (
  elements: CanvasElement[],
  selectionBox: { x: number; y: number; width: number; height: number },
  fontManager?: any
) => {
  return elements.filter(element => {
    const boundingBox = calculateBoundingBox(
      element.tool,
      element.element,
      fontManager
    );

    if (!boundingBox) return false;

    // Check if element is completely inside selection box
    return (
      boundingBox.x >= selectionBox.x &&
      boundingBox.x + boundingBox.width <=
        selectionBox.x + selectionBox.width &&
      boundingBox.y >= selectionBox.y &&
      boundingBox.y + boundingBox.height <= selectionBox.y + selectionBox.height
    );
  });
};

/**
 * Calculates a combined bounding box that encompasses all selected elements
 */
export const calculateCombinedBoundingBox = (
  elements: CanvasElement[],
  margin: number = 10,
  fontManager?: any
) => {
  const boundingBoxes = elements
    .map(element =>
      calculateBoundingBox(element.tool, element.element, fontManager)
    )
    .filter(Boolean) as {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];

  if (boundingBoxes.length === 0) return null;

  // Find the extremes of all bounding boxes
  let minX = boundingBoxes[0].x;
  let minY = boundingBoxes[0].y;
  let maxX = boundingBoxes[0].x + boundingBoxes[0].width;
  let maxY = boundingBoxes[0].y + boundingBoxes[0].height;

  boundingBoxes.forEach(box => {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  });

  // Add margin and return as a bounding box
  return {
    x: minX - margin,
    y: minY - margin,
    width: maxX - minX + margin * 2,
    height: maxY - minY + margin * 2,
  };
};
