import { CanvasElements } from '@/constants/CanvasElement';
import {
  PaintStyle,
  SkCanvas,
  Skia,
  Line as SkLine,
  SkPaint,
  vec,
} from '@shopify/react-native-skia';
import React from 'react';

interface LineProps {
  lineData: CanvasElements.Line;
}

export const Line: React.FC<LineProps> = React.memo(({ lineData }) => {
  const { startPoint, endPoint, strokeColor, strokeWidth } = lineData;

  return (
    <SkLine
      p1={vec(startPoint.x, startPoint.y)}
      p2={vec(endPoint.x, endPoint.y)}
      style="stroke"
      strokeWidth={strokeWidth}
      color={strokeColor}
    />
  );
});

export const renderLine = (
  canvas: SkCanvas,
  paint: SkPaint,
  lineData: CanvasElements.Line
) => {
  const { startPoint, endPoint, strokeColor, strokeWidth } = lineData;

  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));

  canvas.drawLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, paint);
};
