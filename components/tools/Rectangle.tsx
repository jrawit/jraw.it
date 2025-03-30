import { CanvasElements } from '@/constants/CanvasElement';
import { Paint as SkPaint, Rect as SkRect } from '@shopify/react-native-skia';
import React from 'react';

interface RectProps {
  rectData: CanvasElements.Rectangle;
}

export const Rect: React.FC<RectProps> = React.memo(
  ({ rectData: rectData }) => {
    const { point, width, height, strokeColor, strokeWidth, fillColor } =
      rectData;

    return (
      <SkRect
        x={point.x}
        y={point.y}
        width={width}
        height={height}
        style="stroke"
      >
        <SkPaint color={strokeColor} style="stroke" strokeWidth={strokeWidth} />
        {fillColor && <SkPaint color={fillColor} />}
      </SkRect>
    );
  }
);
