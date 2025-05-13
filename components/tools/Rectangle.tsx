import { CanvasElements } from '@/constants/CanvasElement';
import { CanvasElement } from '@/hooks/useCanvas';
import {
  Group,
  PaintStyle,
  Path,
  SkCanvas,
  Skia,
  SkPaint,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface RectProps {
  rectData: CanvasElements.Rectangle;
  elementData?: CanvasElement;
}

const createRectanglePath = (rectData: CanvasElements.Rectangle): SkPath => {
  const { point, width, height, round } = rectData;
  const path = Skia.Path.Make();
  if (round && round > 0) {
    path.addRRect(
      Skia.RRectXY(Skia.XYWHRect(point.x, point.y, width, height), round, round)
    );
  } else {
    path.addRect(Skia.XYWHRect(point.x, point.y, width, height));
  }
  return path;
};

export const Rect: React.FC<RectProps> = ({ rectData, elementData }) => {
  const rotation = elementData?.rotation || 0;
  const { point, width, height, strokeWidth, strokeColor, fillColor } =
    rectData;

  // Calculate the center of the rectangle for rotation
  const centerX = point.x + width / 2;
  const centerY = point.y + height / 2;

  const rectPathString = useMemo(() => {
    const skPath = createRectanglePath(rectData);
    const svgString = skPath.toSVGString();
    skPath.dispose();
    return svgString;
  }, [rectData]);

  return (
    <Group
      transform={
        rotation
          ? [
              { translate: [centerX, centerY] },
              { rotate: rotation },
              { translate: [-centerX, -centerY] },
            ]
          : undefined
      }
    >
      {fillColor && (
        <Path path={rectPathString} color={fillColor} style="fill" />
      )}
      <Path
        path={rectPathString}
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeJoin="miter" // Rectangles typically have mitered corners
      />
    </Group>
  );
};

export const renderRect = (
  canvas: SkCanvas,
  paint: SkPaint,
  rectData: CanvasElements.Rectangle
) => {
  const { strokeColor, strokeWidth, fillColor } = rectData;

  const skPath = createRectanglePath(rectData);

  // Draw fill first
  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));
    canvas.drawPath(skPath, paint);
  }

  // Draw stroke
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));
  paint.setStrokeJoin(Skia.StrokeJoin.Miter); // Ensure miter joins for sharp corners
  canvas.drawPath(skPath, paint);

  skPath.dispose();
};
