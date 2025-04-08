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

interface StarProps {
  starData: CanvasElements.Star;
}

const createStarPath = (
  point: { x: number; y: number },
  radius: number,
  spikes: number
) => {
  const path = Skia.Path.Make();

  const angle = (Math.PI * 2) / spikes;
  const halfAngle = angle / 2;
  const innerRadius = radius / 2;
  path.moveTo(point.x, point.y - radius);
  for (let i = 0; i < spikes; i++) {
    const x = point.x + radius * Math.sin(i * angle);
    const y = point.y - radius * Math.cos(i * angle);
    path.lineTo(x, y);
    const innerX = point.x + innerRadius * Math.sin(i * angle + halfAngle);
    const innerY = point.y - innerRadius * Math.cos(i * angle + halfAngle);
    path.lineTo(innerX, innerY);
  }
  path.lineTo(point.x, point.y - radius);

  path.close();
  return path;
};

export const Star: React.FC<StarProps> = React.memo(
  ({ starData: starData }) => {
    const { point, radius, spikes, strokeColor, strokeWidth, fillColor } =
      starData;

    const path = useMemo(() => {
      return createStarPath(point, radius, spikes);
    }, [point, radius, spikes]);

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

export const renderStar = (
  canvas: SkCanvas,
  paint: SkPaint,
  starData: CanvasElements.Star
) => {
  const { point, radius, spikes, strokeColor, strokeWidth, fillColor } =
    starData;

  const starPath = createStarPath(point, radius, spikes);

  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));
    canvas.drawPath(starPath, paint);
  }

  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));
  canvas.drawPath(starPath, paint);
};
