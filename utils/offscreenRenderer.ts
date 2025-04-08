import { renderCircle } from '@/components/tools/Circle';
import { renderImage } from '@/components/tools/Image';
import { renderLine } from '@/components/tools/Line';
import { renderPath } from '@/components/tools/Path';
import { renderRect } from '@/components/tools/Rectangle';
import { renderStar } from '@/components/tools/Star';
import { renderText } from '@/components/tools/Text';
import { renderTriangle } from '@/components/tools/Triangle';
import { CanvasElements } from '@/constants/CanvasElement';
import { Tools } from '@/constants/Tools';
import { CanvasElement } from '@/hooks/useCanvas';
import {
  SkCanvas,
  SkColor,
  Skia,
  SkImage,
  SkPaint,
} from '@shopify/react-native-skia';
import { calculateCombinedBoundingBox } from './selectionUtils';

/**
 * Draws a single CanvasElement onto a Skia canvas at a specific offset.
 * Handles different element types and potential async operations like image loading.
 */
const drawElementOntoCanvas = async (
  canvas: SkCanvas,
  element: CanvasElement,
  offsetX: number, // x position relative to the offscreen surface's top-left
  offsetY: number, // y position relative to the offscreen surface's top-left
  paint: SkPaint // Reusable paint object
): Promise<void> => {
  const { tool, element: elementData } = element;

  // Reset paint for each element
  paint.reset();
  paint.setAntiAlias(true);

  switch (tool) {
    case Tools.PEN:
    case Tools.HIGHLIGHTER:
    case Tools.ERASER:
      const pathData = elementData as CanvasElements.Path;
      for (const point of pathData.points) {
        // Adjust point positions based on the offset
        point.x += offsetX;
        point.y += offsetY;
      }
      renderPath(canvas, paint, pathData);
      break;

    case Tools.LINE:
      const lineData = elementData as CanvasElements.Line;
      lineData.startPoint.x += offsetX;
      lineData.startPoint.y += offsetY;
      lineData.endPoint.x += offsetX;
      lineData.endPoint.y += offsetY;
      renderLine(canvas, paint, lineData);
      break;

    case Tools.RECTANGLE:
      const rectData = elementData as CanvasElements.Rectangle;
      rectData.point.x += offsetX;
      rectData.point.y += offsetY;
      renderRect(canvas, paint, rectData);
      break;

    case Tools.CIRCLE:
      const circleData = elementData as CanvasElements.Circle;
      circleData.center.x += offsetX;
      circleData.center.y += offsetY;
      renderCircle(canvas, paint, circleData);
      break;

    case Tools.TRIANGLE:
      const triData = elementData as CanvasElements.Triangle;
      triData.point1.x += offsetX;
      triData.point1.y += offsetY;
      triData.point2.x += offsetX;
      triData.point2.y += offsetY;
      triData.point3.x += offsetX;
      triData.point3.y += offsetY;
      renderTriangle(canvas, paint, triData);
      break;

    case Tools.STAR:
      const starData = elementData as CanvasElements.Star;
      starData.point.x += offsetX;
      starData.point.y += offsetY;
      renderStar(canvas, paint, starData);
      break;

    case Tools.TEXT:
      const textData = elementData as CanvasElements.Text;
      textData.point.x += offsetX;
      textData.point.y += offsetY;
      await renderText(canvas, paint, textData);
      break;

    case Tools.IMAGE:
      const imgData = elementData as CanvasElements.Image;
      imgData.point.x += offsetX;
      imgData.point.y += offsetY;
      await renderImage(canvas, paint, imgData);
      break;

    default:
      console.warn(`Offscreen drawing not implemented for tool: ${tool}`);
  }
};

/**
 * Renders an array of CanvasElements onto an offscreen Skia surface.
 * Calculates the required bounds and draws each element.
 *
 * @param elements The array of canvas elements to render.
 * @param fontManager The Skia Font Manager instance.
 * @param padding Optional padding around the combined bounding box.
 * @param backgroundColor Optional background color for the offscreen canvas.
 * @returns A Promise resolving to the rendered SkImage, or null if rendering fails.
 */
export const renderElementsOffscreen = async (
  elements: CanvasElement[],
  fontManager: any,
  padding: number = 10,
  backgroundColor?: SkColor | string
): Promise<SkImage | null> => {
  if (!elements || elements.length === 0) {
    console.warn('No elements provided for offscreen rendering.');
    return null;
  }

  console.log(elements);

  // 1. Calculate Combined Bounds
  const bounds = calculateCombinedBoundingBox(elements, padding, fontManager);
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    console.error('Failed to calculate valid bounding box for elements.');
    return null;
  }

  const imageWidth = Math.ceil(bounds.width);
  const imageHeight = Math.ceil(bounds.height);

  // 2. Create Offscreen Surface
  const surface = Skia.Surface.MakeOffscreen(imageWidth, imageHeight);
  if (!surface) {
    console.error('Failed to create offscreen surface.');
    return null;
  }
  const canvas = surface.getCanvas();

  // 3. Optional: Fill Background
  if (backgroundColor) {
    // Fill the entire surface with background color
    const bgPaint = Skia.Paint();
    bgPaint.setColor(Skia.Color(backgroundColor));
    canvas.drawRect(Skia.XYWHRect(0, 0, imageWidth, imageHeight), bgPaint);
    bgPaint.dispose();
  } else {
    canvas.clear(Skia.Color('transparent'));
  }

  // 4. Draw Each Element onto the Offscreen Canvas
  const paint = Skia.Paint(); // Create a reusable paint object
  try {
    for (const element of elements) {
      // Apply the negative bounds offset to position elements properly
      // This shifts all elements so the bounding box's top-left becomes the canvas origin (0,0)
      const negativeOffsetX = -bounds.x;
      const negativeOffsetY = -bounds.y;

      await drawElementOntoCanvas(
        canvas,
        element,
        negativeOffsetX,
        negativeOffsetY,
        paint
      );
    }

    // 5. Get Snapshot from Offscreen Surface
    surface.flush();
    const image = surface.makeImageSnapshot();
    if (!image) {
      console.error('Failed to create image snapshot from offscreen surface.');
      return null;
    }
    return image;
  } catch (error) {
    console.error('Error drawing elements onto offscreen canvas:', error);
    return null;
  } finally {
    // Clean up resources if needed
    surface.dispose();
    paint.dispose();
  }
};
