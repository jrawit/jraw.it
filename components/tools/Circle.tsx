import { CanvasElements } from '@/constants/CanvasElement';
import {
  Paint,
  PaintStyle,
  SkCanvas,
  Circle as SkCircle,
  Skia,
  SkPaint,
} from '@shopify/react-native-skia';
import React from 'react';

interface CircleProps {
  circleData: CanvasElements.Circle;
}

export const Circle: React.FC<CircleProps> = React.memo(({ circleData }) => {
  const { center, radius, strokeColor, strokeWidth, fillColor } = circleData;

  return (
    <SkCircle cx={center.x} cy={center.y} r={radius} style="stroke">
      <Paint color={strokeColor} style="stroke" strokeWidth={strokeWidth} />
      {fillColor && <Paint color={fillColor} />}
    </SkCircle>
  );
});

export const renderCircle = (
  canvas: SkCanvas,
  paint: SkPaint,
  circleData: CanvasElements.Circle
) => {
  const { center, radius, strokeColor, strokeWidth, fillColor } = circleData;
  // Draw fill first
  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));
    canvas.drawCircle(center.x, center.y, radius, paint);
  }

  // Draw stroke
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));
  canvas.drawCircle(center.x, center.y, radius, paint);
};
