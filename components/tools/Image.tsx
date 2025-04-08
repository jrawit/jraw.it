import { CanvasElements } from '@/constants/CanvasElement';
import {
  SkCanvas,
  Skia,
  Image as SkImage,
  SkPaint,
  useImage,
} from '@shopify/react-native-skia';
import * as FileSystem from 'expo-file-system';
import React from 'react';
import { Platform } from 'react-native'; // Import Platform

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

export const renderImage = (
  canvas: SkCanvas,
  paint: SkPaint,
  imageData: CanvasElements.Image
) => {
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
    return;
  }

  const processImage = (base64: string) => {
    const skImageData = Skia.Data.fromBase64(base64);
    const skImage = Skia.Image.MakeImageFromEncoded(skImageData);
    if (skImage) {
      // Assuming width and height in imageData are the intended render dimensions
      const srcRect = Skia.XYWHRect(0, 0, skImage.width(), skImage.height());
      const destRect = Skia.XYWHRect(point.x, point.y, width, height);
      canvas.drawImageRect(skImage, srcRect, destRect, paint);
    } else {
      console.error('Failed to create Skia image from base64 data.');
    }
  };

  if (Platform.OS !== 'web') {
    FileSystem.readAsStringAsync(uriString, {
      encoding: FileSystem.EncodingType.Base64,
    })
      .then(processImage)
      .catch(error => {
        console.error('Error reading image file:', error);
      });
  } else {
    // Web implementation using fetch and FileReader
    fetch(uriString)
      .then(response => response.blob())
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Remove the "data:image/...;base64," prefix
          const base64 = base64data.split(',')[1];
          if (base64) {
            processImage(base64);
          } else {
            console.error('Failed to extract base64 data from data URL.');
          }
        };
        reader.onerror = error => {
          console.error('FileReader error:', error);
        };
        reader.readAsDataURL(blob);
      })
      .catch(error => {
        console.error('Error fetching image for web:', error);
      });
  }
};
