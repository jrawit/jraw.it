import { CanvasElements } from '@/constants/CanvasElement';
import {
  Circle as SkCircle,
  Paint as SkPaint,
} from '@shopify/react-native-skia';
import React from 'react';

interface CircleProps {
  circleData: CanvasElements.Circle;
}

export const Circle: React.FC<CircleProps> = React.memo(({ circleData }) => {
  const { center, radius, strokeColor, strokeWidth, fillColor } = circleData;

  return (
    <SkCircle cx={center.x} cy={center.y} r={radius} style="stroke">
      <SkPaint color={strokeColor} style="stroke" strokeWidth={strokeWidth} />
      {fillColor && <SkPaint color={fillColor} />}
    </SkCircle>
  );
});
