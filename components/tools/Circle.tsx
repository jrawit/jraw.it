import { CanvasElements } from '@/constants/CanvasElement';
import React from 'react';
import { Path as SkPathRenderer } from './Path';

interface CircleProps {
  circleData: CanvasElements.Path;
}

export const Circle: React.FC<CircleProps> = ({ circleData }) => {
  return <SkPathRenderer pathData={circleData} />;
};
