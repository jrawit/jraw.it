import { CanvasElements } from '@/constants/CanvasElement';
import { CanvasElement } from '@/hooks/useCanvas';
import { Paint, Path, Skia } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface TriangleProps {
  triangleData: CanvasElements.Path | CanvasElements.Triangle;
  elementData?: CanvasElement;
}

export const Triangle: React.FC<TriangleProps> = ({
  triangleData,
  elementData,
}) => {
  // Extract stroke and fill properties that are common to both Path and Triangle
  const strokeColor = triangleData.strokeColor;
  const strokeWidth = triangleData.strokeWidth;
  const fillColor =
    'fillColor' in triangleData ? triangleData.fillColor : undefined;

  // Create a path from either Path or Triangle data
  const path = useMemo(() => {
    const path = Skia.Path.Make();

    // Check if we have Path points (new format) or Triangle points (old format)
    if ('points' in triangleData) {
      const points = triangleData.points;
      if (points.length >= 3) {
        path.moveTo(points[0].x, points[0].y);
        path.lineTo(points[1].x, points[1].y);
        path.lineTo(points[2].x, points[2].y);
        path.close();
      }
    } else {
      // Legacy format - handle as before
      const { point1, point2, point3 } =
        triangleData as CanvasElements.Triangle;
      path.moveTo(point1.x, point1.y);
      path.lineTo(point2.x, point2.y);
      path.lineTo(point3.x, point3.y);
      path.close();
    }

    return path;
  }, [triangleData]);

  // Return the triangle as a path
  return (
    <Path path={path} style="stroke">
      {fillColor && <Paint color={fillColor} style="fill" />}
      <Paint
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeJoin="miter"
      />
    </Path>
  );
};

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
