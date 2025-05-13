import { CanvasElements } from '@/constants/CanvasElement';
import { CanvasElement } from '@/hooks/useCanvas';
import { calculateStarVertices } from '@/utils/geometryUtils';
import { Group, Path } from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface StarProps {
  starData: CanvasElements.Star;
  elementData?: CanvasElement;
}

export const Star: React.FC<StarProps> = ({ starData, elementData }) => {
  const rotation = elementData?.rotation || 0;
  const { point, radius, spikes, strokeWidth, strokeColor, fillColor } =
    starData;

  // Create star path
  const starPath = useMemo(() => {
    const vertices = calculateStarVertices(
      { x: 0, y: 0 }, // Create star relative to origin (0,0)
      radius,
      0.5,
      spikes
    );

    let path = `M ${vertices[0].x} ${vertices[0].y}`;
    for (let i = 1; i < vertices.length; i++) {
      path += ` L ${vertices[i].x} ${vertices[i].y}`;
    }
    path += ' Z';
    return path;
  }, [radius, spikes]);

  // The star's center is at the point
  return (
    <Group
      transform={[
        // First translate to the star's position
        { translate: [point.x, point.y] },
        // Then apply rotation if needed
        ...(rotation ? [{ rotate: rotation }] : []),
      ]}
    >
      <Path
        path={starPath}
        strokeWidth={strokeWidth}
        style="stroke"
        color={strokeColor}
      />
      {fillColor && <Path path={starPath} style="fill" color={fillColor} />}
    </Group>
  );
};
