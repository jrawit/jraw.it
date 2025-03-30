import { CanvasElements } from '@/constants/CanvasElement';
import { Image as SkImage, useImage } from '@shopify/react-native-skia';
import React from 'react';

interface ImageProps {
  imageData: CanvasElements.Image;
}

export const Image: React.FC<ImageProps> = React.memo(({ imageData }) => {
  const { point, width, height, uri } = imageData;

  // Extract the actual URI string from the uri object
  const uriString =
    typeof uri === 'object' && uri !== null && 'uri' in uri
      ? uri.uri
      : typeof uri === 'string'
        ? uri
        : null;

  if (!uriString) {
    console.error('Invalid URI:', uri);
    return null;
  }

  const image = useImage(uriString, error => {
    if (error) {
      console.error('Error loading image:', error);
    }
  });

  if (!image) {
    return null;
  }

  return (
    <SkImage
      image={image}
      x={point.x}
      y={point.y}
      width={width}
      height={height}
    />
  );
});
