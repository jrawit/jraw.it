import { CanvasElements } from '@/constants/CanvasElement';
import {
  BlendMode,
  PaintStyle,
  SkCanvas,
  Skia,
  SkPaint,
  Path as SkPathType, // Renamed to avoid conflict
  StrokeCap,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface PathProps {
  pathData: CanvasElements.Path;
  // elementData is not used here if rotation is baked into points
}

// Updated createPath to handle smoothed (pen/highlighter) vs polygonal paths
const createSkiaPath = (
  points: { x: number; y: number }[],
  isSmoothed: boolean, // True for PEN/HIGHLIGHTER
  isClosed?: boolean // True for RECTANGLE, STAR, CIRCLE, TRIANGLE
): SkPathType => {
  const skPath = Skia.Path.Make();
  if (points.length === 0) return skPath;

  skPath.moveTo(points[0].x, points[0].y);

  if (isSmoothed) {
    if (points.length === 2) {
      skPath.lineTo(points[1].x, points[1].y);
    } else if (points.length > 2) {
      for (let i = 1; i < points.length - 1; i++) {
        const curr = points[i];
        const next = points[i + 1];
        const mid = { x: (curr.x + next.x) / 2, y: (curr.y + next.y) / 2 };
        skPath.quadTo(curr.x, curr.y, mid.x, mid.y);
      }
      const last = points[points.length - 1];
      const secondLast = points[points.length - 2];
      skPath.quadTo(secondLast.x, secondLast.y, last.x, last.y);
    }
  } else {
    // Polygonal path
    for (let i = 1; i < points.length; i++) {
      skPath.lineTo(points[i].x, points[i].y);
    }
    if (isClosed && points.length > 1) {
      skPath.close();
    }
  }
  return skPath;
};

export const Path: React.FC<PathProps> = React.memo(({ pathData }) => {
  const {
    points,
    capStyle,
    blendMode,
    strokeWidth,
    strokeColor,
    fillColor, // Added fillColor
    closed, // Added closed
  } = pathData;

  // Determine if smoothing should be applied (e.g., for PEN tool, not for RECTANGLE)
  // This logic might need to be based on the tool type if pathData doesn't specify smoothing.
  // For now, assume 'closed' paths are not smoothed. This is a heuristic.
  // A more robust way would be to pass the tool type or a 'smoothed' flag.
  const isSmoothed = !closed && capStyle === 'round'; // Heuristic: pen/highlighter are smoothed

  const skPathInstance = useMemo(() => {
    return createSkiaPath(points, isSmoothed, closed);
  }, [points, isSmoothed, closed]);

  return (
    <>
      {fillColor && closed && (
        <SkPathType
          path={skPathInstance}
          style="fill"
          color={fillColor}
          blendMode={blendMode} // Blend mode might apply to fill too
        />
      )}
      <SkPathType
        path={skPathInstance}
        style="stroke"
        strokeWidth={strokeWidth}
        color={strokeColor}
        strokeCap={capStyle}
        blendMode={blendMode}
      />
    </>
  );
});

export const renderPath = (
  canvas: SkCanvas,
  paint: SkPaint,
  pathData: CanvasElements.Path,
  toolType?: Tools // Optional: to decide smoothing, though pathData.closed is better
) => {
  const {
    points,
    capStyle,
    blendMode,
    strokeWidth,
    strokeColor,
    fillColor,
    closed,
  } = pathData;

  // Heuristic for smoothing, similar to the component
  const isSmoothed = !closed && capStyle === 'round';
  const skPathInstance = createSkiaPath(points, isSmoothed, closed);

  // Fill
  if (fillColor && closed) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));
    if (blendMode) {
      paint.setBlendMode(
        blendMode === 'clear' ? BlendMode.Clear : BlendMode.SrcOver
      );
    } else {
      paint.setBlendMode(BlendMode.SrcOver); // Default for fill
    }
    canvas.drawPath(skPathInstance, paint);
  }

  // Stroke
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));

  if (capStyle) {
    paint.setStrokeCap(
      capStyle === 'butt'
        ? StrokeCap.Butt
        : capStyle === 'round'
          ? StrokeCap.Round
          : StrokeCap.Square
    );
  } else {
    paint.setStrokeCap(StrokeCap.Butt); // Default
  }

  if (blendMode) {
    paint.setBlendMode(
      blendMode === 'clear' ? BlendMode.Clear : BlendMode.SrcOver
    );
  } else {
    paint.setBlendMode(BlendMode.SrcOver); // Default for stroke
  }

  canvas.drawPath(skPathInstance, paint);
  // skPathInstance.dispose(); // If created locally and not memoized/managed by Skia view
};
