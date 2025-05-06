import { CanvasElements } from '@/constants/CanvasElement';
import {
  Paint,
  PaintStyle,
  SkCanvas,
  Skia,
  SkPaint,
  Path as SkPath,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface CircleProps {
  circleData: CanvasElements.Circle;
}

export const Circle: React.FC<CircleProps> = React.memo(({ circleData }) => {
  const { center, radiusX, radiusY, strokeColor, strokeWidth, fillColor } =
    circleData;

  // Create an elliptical path
  const path = useMemo(() => {
    const path = Skia.Path.Make();
    path.addOval(
      Skia.XYWHRect(
        center.x - radiusX,
        center.y - radiusY,
        radiusX * 2,
        radiusY * 2
      )
    );
    return path;
  }, [center.x, center.y, radiusX, radiusY]);

  return (
    <SkPath path={path} style="stroke">
      {fillColor && <Paint color={fillColor} />}
      <Paint color={strokeColor} style="stroke" strokeWidth={strokeWidth} />
    </SkPath>
  );
});

export const renderCircle = (
  canvas: SkCanvas,
  paint: SkPaint,
  circleData: CanvasElements.Circle
) => {
  const { center, radiusX, radiusY, strokeColor, strokeWidth, fillColor } =
    circleData;

  // Create an elliptical path
  const path = Skia.Path.Make();
  path.addOval(
    Skia.XYWHRect(
      center.x - radiusX,
      center.y - radiusY,
      radiusX * 2,
      radiusY * 2
    )
  );

  // Draw fill first
  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));
    canvas.drawPath(path, paint);
  }

  // Draw stroke
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));
  canvas.drawPath(path, paint);
};
