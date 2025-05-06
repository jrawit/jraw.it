import { CanvasElements } from '@/constants/CanvasElement';
import {
  Group,
  Oval,
  PaintStyle,
  SkCanvas,
  Skia,
  SkPaint,
} from '@shopify/react-native-skia';
import React from 'react';

interface CircleProps {
  circleData: CanvasElements.Circle;
}

export const Circle: React.FC<CircleProps> = React.memo(({ circleData }) => {
  const { center, radiusX, radiusY, strokeColor, strokeWidth, fillColor } =
    circleData;

  const x = center.x - radiusX;
  const y = center.y - radiusY;
  const width = radiusX * 2;
  const height = radiusY * 2;

  return (
    <Group>
      {/* Draw fill first if specified */}
      {fillColor && (
        <Oval x={x} y={y} width={width} height={height} color={fillColor} />
      )}

      {/* Draw stroke */}
      <Oval
        x={x}
        y={y}
        width={width}
        height={height}
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
      />
    </Group>
  );
});

export const renderCircle = (
  canvas: SkCanvas,
  paint: SkPaint,
  circleData: CanvasElements.Circle
) => {
  const { center, radiusX, radiusY, strokeColor, strokeWidth, fillColor } =
    circleData;

  const x = center.x - radiusX;
  const y = center.y - radiusY;
  const width = radiusX * 2;
  const height = radiusY * 2;

  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));
    canvas.drawOval(Skia.XYWHRect(x, y, width, height), paint);
  }

  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));
  canvas.drawOval(Skia.XYWHRect(x, y, width, height), paint);
};
