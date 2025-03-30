import { CanvasElements } from '@/constants/CanvasElement';
import { Skia, Path as SkPath } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface PathProps {
  pathData: CanvasElements.Path;
}

export const Path: React.FC<PathProps> = React.memo(({ pathData }) => {
  const { points, capStyle, blendMode, strokeWidth, strokeColor } = pathData;

  const path = useMemo(() => {
    const newPath = Skia.Path.Make();

    if (points.length < 2) return newPath;

    // Start the path at the first point
    newPath.moveTo(points[0].x, points[0].y);

    // For just 2 points, draw a straight line
    if (points.length === 2) {
      newPath.lineTo(points[1].x, points[1].y);
      return newPath;
    }

    // For 3+ points, use cubic bezier curves for smoothing
    for (let i = 1; i < points.length - 1; i++) {
      // Calculate control points
      const curr = points[i];
      const next = points[i + 1];

      // Calculate midpoint between points
      const mid = { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 };

      // Draw a smooth curve from mid1 to mid2 using curr as control point
      newPath.quadTo(
        curr.x,
        curr.y, // control point
        mid.x,
        mid.y // destination
      );
    }

    // Add the last point
    const last = points[points.length - 1];
    const secondLast = points[points.length - 2];
    newPath.quadTo(secondLast.x, secondLast.y, last.x, last.y);

    return newPath;
  }, [points]);

  return (
    <SkPath
      path={path}
      style="stroke"
      strokeWidth={strokeWidth}
      color={strokeColor}
      strokeCap={capStyle}
      blendMode={blendMode}
    />
  );
});
