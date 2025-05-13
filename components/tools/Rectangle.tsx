import { CanvasElements } from '@/constants/CanvasElement';
import { CanvasElement } from '@/hooks/useCanvas';
import { Group, RoundedRect } from '@shopify/react-native-skia';
import React from 'react';

interface RectProps {
  rectData: CanvasElements.Rectangle;
  elementData?: CanvasElement;
}

export const Rect: React.FC<RectProps> = ({ rectData, elementData }) => {
  const rotation = elementData?.rotation || 0;
  const { point, width, height, strokeWidth, strokeColor, fillColor, round } =
    rectData;

  // Calculate the center of the rectangle for rotation
  const centerX = point.x + width / 2;
  const centerY = point.y + height / 2;

  return (
    <Group
      transform={
        rotation
          ? [
              // Apply rotation around the center point of the rectangle
              { translate: [centerX, centerY] },
              { rotate: rotation },
              { translate: [-centerX, -centerY] },
            ]
          : undefined
      }
    >
      <RoundedRect
        x={point.x}
        y={point.y}
        width={width}
        height={height}
        r={round || 0}
        strokeWidth={strokeWidth}
        color={strokeColor}
        style="stroke"
      />
      {fillColor && (
        <RoundedRect
          x={point.x}
          y={point.y}
          width={width}
          height={height}
          r={round || 0}
          color={fillColor}
          style="fill"
        />
      )}
    </Group>
  );
};

export const renderRect = (
  canvas: SkCanvas,
  paint: SkPaint,
  rectData: CanvasElements.Rectangle
) => {
  const { point, width, height, round, strokeColor, strokeWidth, fillColor } =
    rectData;

  // Draw fill first
  if (fillColor) {
    paint.setStyle(PaintStyle.Fill);
    paint.setColor(Skia.Color(fillColor));

    if (round) {
      const skRRect = Skia.RRectXY(
        Skia.XYWHRect(point.x, point.y, width, height),
        round,
        round
      );
      canvas.drawRRect(skRRect, paint);
    } else {
      const skRect = Skia.XYWHRect(point.x, point.y, width, height);
      canvas.drawRect(skRect, paint);
    }
  }

  // Draw stroke
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(strokeColor));

  if (round) {
    const skRRect = Skia.RRectXY(
      Skia.XYWHRect(point.x, point.y, width, height),
      round,
      round
    );
    canvas.drawRRect(skRRect, paint);
  } else {
    const skRect = Skia.XYWHRect(point.x, point.y, width, height);
    canvas.drawRect(skRect, paint);
  }
};
