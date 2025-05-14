import { CanvasElements } from '@/constants/CanvasElement';
import React from 'react';
import { Path as SkPathRenderer } from './Path';

interface StarProps {
  starData: CanvasElements.Path;
}

export const Star: React.FC<StarProps> = ({ starData }) => {
  return <SkPathRenderer pathData={starData} />;
};
