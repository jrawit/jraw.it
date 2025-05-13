import { CanvasElements } from '@/constants/CanvasElement';
import React from 'react';
import { Path as SkPathRenderer } from './Path';

interface RectProps {
  rectData: CanvasElements.Path;
}

export const Rect: React.FC<RectProps> = ({ rectData }) => {
  return <SkPathRenderer pathData={rectData} />;
};

/*
export const renderRect = (
  canvas: SkCanvas,
  paint: SkPaint,
  rectData: CanvasElements.Rectangle // This signature needs to change to Path if used
) => {
  // This function would need to be updated to take CanvasElements.Path
  // and use the generic path rendering logic if it's still required.
  // For now, focusing on the React component.
  const { strokeColor, strokeWidth, fillColor } = rectData;

  // const skPath = createRectanglePath(rectData); // Old helper

  // Draw fill first
  // if (fillColor) {
  //   paint.setStyle(PaintStyle.Fill);
  //   paint.setColor(Skia.Color(fillColor));
  //   canvas.drawPath(skPath, paint);
  // }

  // // Draw stroke
  // paint.setStyle(PaintStyle.Stroke);
  // paint.setStrokeWidth(strokeWidth);
  // paint.setColor(Skia.Color(strokeColor));
  // paint.setStrokeJoin(Skia.StrokeJoin.Miter); 
  // canvas.drawPath(skPath, paint);

  // skPath.dispose();
};
*/
