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

export type Selection = {
  ids: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  selected: boolean;
  rotation?: number; // Add rotation property
};

export const isPointInsideBox = (
  point: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number }
): boolean => {
  const normX = box.width < 0 ? box.x + box.width : box.x;
  const normY = box.height < 0 ? box.y + box.height : box.y;
  const normW = Math.abs(box.width);
  const normH = Math.abs(box.height);

  return (
    point.x >= normX &&
    point.x <= normX + normW &&
    point.y >= normY &&
    point.y <= normY + normH
  );
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
      if (!points || points.length === 0) return null; // Guard against empty points
      const minX = Math.min(...points.map(point => point.x));
      const minY = Math.min(...points.map(point => point.y));
      const maxX = Math.max(...points.map(point => point.x));
      const maxY = Math.max(...points.map(point => point.y));

      // Be more generous with stroke allowance for paths to account for miter joins and caps.
      // Skia's default miter limit is 4. A miter can extend by `miterLimit * strokeWidth / 2`.
      // Using strokeWidth directly (instead of strokeWidth/2) as padding on each side should be safer.
      const pathStrokeAllowance = strokeWidth; // Increased from strokeWidth / 2

      return {
        x: minX - pathStrokeAllowance,
        y: minY - pathStrokeAllowance,
        width: maxX - minX + 2 * pathStrokeAllowance,
        height: maxY - minY + 2 * pathStrokeAllowance,
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
    case Tools.CIRCLE:
    case Tools.TRIANGLE:
    case Tools.STAR: {
      // All these shapes are now CanvasElements.Path
      const pathData = data as CanvasElements.Path;
      if (!pathData.points || pathData.points.length === 0) return null;

      const { points, strokeWidth = 0 } = pathData;
      const minX = Math.min(...points.map(point => point.x));
      const minY = Math.min(...points.map(point => point.y));
      const maxX = Math.max(...points.map(point => point.x));
      const maxY = Math.max(...points.map(point => point.y));

      // Consistent stroke allowance for all path-based shapes
      const pathStrokeAllowance = strokeWidth;

      return {
        x: minX - pathStrokeAllowance,
        y: minY - pathStrokeAllowance,
        width: maxX - minX + 2 * pathStrokeAllowance,
        height: maxY - minY + 2 * pathStrokeAllowance,
      };
    }
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
    case Tools.EMOJI:
      const { point: emojiPoint, size: emojiSize } =
        data as CanvasElements.Emoji;
      return {
        x: emojiPoint.x,
        y: emojiPoint.y,
        width: emojiSize,
        height: emojiSize * 1.1,
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
    // Use calculateElementBoundingBox to get the AABB of the potentially rotated element
    const elementAABB = calculateElementBoundingBox(element, 0, fontManager); // Use 0 margin for precise check

    if (!elementAABB) return false;

    // Check for intersection between the element's AABB and the selection box.
    // The selectionBox is already normalized (positive width/height) when this function is called
    // from calculateSelectionBounds.
    const intersects =
      elementAABB.x < selectionBox.x + selectionBox.width &&
      elementAABB.x + elementAABB.width > selectionBox.x &&
      elementAABB.y < selectionBox.y + selectionBox.height &&
      elementAABB.y + elementAABB.height > selectionBox.y;

    return intersects;
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
      // Use calculateElementBoundingBox to get the AABB of potentially rotated elements
      // Pass 0 for margin here, as the overall margin is added by this function later
      calculateElementBoundingBox(element, 0, fontManager)
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

export const calculateElementBoundingBox = (
  element: CanvasElement,
  margin: number = 10,
  fontManager?: any
): BoundingBox | null => {
  if (!element) return null;
  const boundingBox = calculateBoundingBox(
    element.tool,
    element.element,
    fontManager
  );
  if (!boundingBox) return null;
  // The margin is applied to the unrotated bounding box first.
  // This was identified as potentially problematic if margin should be an outer shell to the final rotated AABB.
  // However, the previous logic (applying margin before calculating rotated AABB dimensions)
  // often results in a LARGER final box, which is safer against "poking out".
  // Reverting to applying margin to the unrotated box before calculating rotated AABB dimensions,
  // as the primary fix is now targeted at calculateBoundingBox's stroke allowance.

  const marginedBox = {
    x: boundingBox.x - margin,
    y: boundingBox.y - margin,
    width: boundingBox.width + margin * 2,
    height: boundingBox.height + margin * 2,
  };

  if (element.rotation && marginedBox) {
    // Calculate a bounding box that encompasses the rotated margined box
    const centerX = marginedBox.x + marginedBox.width / 2;
    const centerY = marginedBox.y + marginedBox.height / 2;

    const cos = Math.abs(Math.cos(element.rotation));
    const sin = Math.abs(Math.sin(element.rotation));
    const newWidth = marginedBox.width * cos + marginedBox.height * sin;
    const newHeight = marginedBox.width * sin + marginedBox.height * cos;

    return {
      x: centerX - newWidth / 2,
      y: centerY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    };
  }

  return marginedBox; // Return margined unrotated box if no rotation
};
