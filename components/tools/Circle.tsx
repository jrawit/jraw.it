import { CanvasElements } from '@/constants/CanvasElement';
import { CanvasElement } from '@/hooks/useCanvas';
import { Group, Path, Skia } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface CircleProps {
  circleData: CanvasElements.Circle;
  elementData?: CanvasElement;
}

export const Circle: React.FC<CircleProps> = ({ circleData, elementData }) => {
  const rotation = elementData?.rotation || 0;
  const { center, radiusX, radiusY, strokeWidth, strokeColor, fillColor } =
    circleData;

  // Ensure non-zero radius values
  const safeRadiusX = Math.max(0.1, radiusX);
  const safeRadiusY = Math.max(0.1, radiusY);

  // Create an ellipse path
  const circlePath = useMemo(() => {
    // Create a path for an ellipse centered at origin (to be translated later)
    const path = Skia.Path.Make();

    // Draw an oval using arc commands
    path.addOval({
      x: center.x - safeRadiusX,
      y: center.y - safeRadiusY,
      width: safeRadiusX * 2,
      height: safeRadiusY * 2,
    });

    return path.toSVGString();
  }, [center.x, center.y, safeRadiusX, safeRadiusY]);

  console.log(
    `Rendering Circle with Path: radiusX=${safeRadiusX}, radiusY=${safeRadiusY}, rotation=${rotation}`
  );

  return (
    <Group
      transform={[
        // Apply rotation around the center point
        { translateX: center.x },
        { translateY: center.y },
        { rotate: rotation },
        { translateX: -center.x },
        { translateY: -center.y },
      ]}
    >
      {/* Fill */}
      {fillColor && <Path path={circlePath} color={fillColor} style="fill" />}

      {/* Stroke */}
      <Path
        path={circlePath}
        color={strokeColor}
        style="stroke"
        strokeWidth={strokeWidth}
      />
    </Group>
  );
};
