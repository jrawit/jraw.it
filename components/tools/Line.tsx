import { CanvasElements } from '@/constants/CanvasElement';
import { Line as SkLine, vec } from '@shopify/react-native-skia';
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
