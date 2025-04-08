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

interface TriangleProps {
  triangleData: CanvasElements.Triangle;
}

export const Triangle: React.FC<TriangleProps> = React.memo(
  ({ triangleData: triangleData }) => {
    const { point1, point2, point3, strokeColor, strokeWidth, fillColor } =
      triangleData;

    const path = useMemo(() => {
      const path = Skia.Path.Make();
      path.moveTo(point1.x, point1.y);
      path.lineTo(point2.x, point2.y);
      path.lineTo(point3.x, point3.y);
      path.close();
      return path;
    }, [point1, point2, point3, strokeWidth]);

    return (
      <SkPath path={path} style="stroke">
        <Paint
          color={strokeColor}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeJoin="miter"
        />
        {fillColor && <Paint color={fillColor} />}
      </SkPath>
    );
  }
);

export const renderTriangle = (
  canvas: SkCanvas,
  paint: SkPaint,
  triangleData: CanvasElements.Triangle
) => {
  const { point1, point2, point3, strokeColor, strokeWidth, fillColor } =
    triangleData;

  const path = Skia.Path.Make();
  path.moveTo(point1.x, point1.y);
  path.lineTo(point2.x, point2.y);
  path.lineTo(point3.x, point3.y);
  path.close();

  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));
    canvas.drawPath(path, paint);
  }

  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));
  canvas.drawPath(path, paint);
};
