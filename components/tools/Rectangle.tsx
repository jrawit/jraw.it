import { CanvasElements } from '@/constants/CanvasElement';
import {
  Paint,
  PaintStyle,
  SkCanvas,
  Skia,
  SkPaint,
  Rect as SkRect,
  RoundedRect as SkRoundedRect,
} from '@shopify/react-native-skia';
import React from 'react';

interface RectProps {
  rectData: CanvasElements.Rectangle;
}

export const Rect: React.FC<RectProps> = React.memo(
  ({ rectData: rectData }) => {
    const { point, width, height, round, strokeColor, strokeWidth, fillColor } =
      rectData;

    if (round) {
      return (
        <SkRoundedRect
          x={point.x}
          y={point.y}
          width={width}
          height={height}
          r={round}
          style="stroke"
        >
          <Paint color={strokeColor} style="stroke" strokeWidth={strokeWidth} />
          {fillColor && <Paint color={fillColor} />}
        </SkRoundedRect>
      );
    }

    return (
      <SkRect
        x={point.x}
        y={point.y}
        width={width}
        height={height}
        style="stroke"
      >
        {fillColor && <Paint color={fillColor} />}
        <Paint color={strokeColor} style="stroke" strokeWidth={strokeWidth} />
      </SkRect>
    );
  }
);

export const renderRect = (
  canvas: SkCanvas,
  paint: SkPaint,
  rectData: CanvasElements.Rectangle
) => {
  const { point, width, height, round, strokeColor, strokeWidth, fillColor } =
    rectData;

  // Draw fill first
  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));

    if (round) {
      const skRRect = Skia.RRectXY(
        Skia.XYWHRect(point.x, point.y, width, height),
        round,
        round
      );
      canvas.drawRRect(skRRect, paint);
    } else {
      const skRect = Skia.XYWHRect(point.x, point.y, width, height);
      canvas.drawRect(skRect, paint);
    }
  }

  // Draw stroke
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));

  if (round) {
    const skRRect = Skia.RRectXY(
      Skia.XYWHRect(point.x, point.y, width, height),
      round,
      round
    );
    canvas.drawRRect(skRRect, paint);
  } else {
    const skRect = Skia.XYWHRect(point.x, point.y, width, height);
    canvas.drawRect(skRect, paint);
  }
};
