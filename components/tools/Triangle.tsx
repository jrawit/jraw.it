import { CanvasElements } from '@/constants/CanvasElement';
// import { CanvasElement } from '@/hooks/useCanvas'; // Not needed if rotation is baked
// import { Paint, Path, Skia } from '@shopify/react-native-skia'; // Reduce imports
// import { SkCanvas, SkPaint, PaintStyle } from '@shopify/react-native-skia'; // For renderTriangle
import React from 'react';
import { Path as SkPathRenderer } from './Path'; // Use the generic Path renderer

interface TriangleProps {
  // triangleData: CanvasElements.Path | CanvasElements.Triangle; // Old type
  triangleData: CanvasElements.Path; // New type: Triangle is represented as a Path
  // elementData?: CanvasElement; // Not needed if rotation is baked
}

export const Triangle: React.FC<TriangleProps> = ({ triangleData }) => {
  // triangleData is now always a CanvasElements.Path
  // The points define the 3 vertices of the triangle.
  // Stroke, fill, closed are properties of triangleData (Path).

  return <SkPathRenderer pathData={triangleData} />;
};

/*
export const renderTriangle = (
  canvas: SkCanvas,
  paint: SkPaint,
  triangleData: CanvasElements.Triangle // This signature needs to change to Path if used
) => {
  // This function would need to be updated to take CanvasElements.Path
  // and use the generic path rendering logic if it's still required.
  const { point1, point2, point3, strokeColor, strokeWidth, fillColor } =
    triangleData;

  // const path = Skia.Path.Make();
  // path.moveTo(point1.x, point1.y);
  // path.lineTo(point2.x, point2.y);
  // path.lineTo(point3.x, point3.y);
  // path.close();

  // if (fillColor) {
  //   paint.setStyle(PaintStyle.Fill);
  //   paint.setColor(Skia.Color(fillColor));
  //   canvas.drawPath(path, paint);
  // }

  // paint.setStyle(PaintStyle.Stroke);
  // paint.setStrokeWidth(strokeWidth);
  // paint.setColor(Skia.Color(strokeColor));
  // canvas.drawPath(path, paint);
  // path.dispose();
};
*/
