import { CanvasElements } from '@/constants/CanvasElement';
import {
  Skia,
  Paint as SkPaint,
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
      // Calculate centroid of the triangle
      const centroid = {
        x: (point1.x + point2.x + point3.x) / 3,
        y: (point1.y + point2.y + point3.y) / 3,
      };

      // Calculate vectors from centroid to each point
      const vecToPoint1 = {
        x: point1.x - centroid.x,
        y: point1.y - centroid.y,
      };
      const vecToPoint2 = {
        x: point2.x - centroid.x,
        y: point2.y - centroid.y,
      };
      const vecToPoint3 = {
        x: point3.x - centroid.x,
        y: point3.y - centroid.y,
      };

      // Normalize vectors
      const normalize = (v: { x: number; y: number }) => {
        const length = Math.sqrt(v.x * v.x + v.y * v.y);
        return length > 0
          ? { x: v.x / length, y: v.y / length }
          : { x: 0, y: 0 };
      };

      const normVec1 = normalize(vecToPoint1);
      const normVec2 = normalize(vecToPoint2);
      const normVec3 = normalize(vecToPoint3);

      // Adjust points inward by strokeWidth
      const adjustedPoint1 = {
        x: point1.x - normVec1.x * strokeWidth,
        y: point1.y - normVec1.y * strokeWidth,
      };
      const adjustedPoint2 = {
        x: point2.x - normVec2.x * strokeWidth,
        y: point2.y - normVec2.y * strokeWidth,
      };
      const adjustedPoint3 = {
        x: point3.x - normVec3.x * strokeWidth,
        y: point3.y - normVec3.y * strokeWidth,
      };

      const path = Skia.Path.Make();
      path.moveTo(adjustedPoint1.x, adjustedPoint1.y);
      path.lineTo(adjustedPoint2.x, adjustedPoint2.y);
      path.lineTo(adjustedPoint3.x, adjustedPoint3.y);
      path.close();
      return path;
    }, [point1, point2, point3, strokeWidth]);

    return (
      <SkPath path={path} style="stroke">
        <SkPaint
          color={strokeColor}
          style="stroke"
          strokeWidth={strokeWidth}
          strokeJoin="miter"
        />
        {fillColor && <SkPaint color={fillColor} />}
      </SkPath>
    );
  }
);
