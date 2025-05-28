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
  const image = useImage(uriString, error => {
    if (error) {
      console.error('Error loading image:', error);
    }
  });
  if (!uriString) {
    console.error('Invalid URI:', uri);
    return null;
  }

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
      fit="fill"
    />
  );
});

export const renderImage = async (
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

  try {
    if (Platform.OS !== 'web') {
      // Non-web implementation using FileSystem
      const base64 = await FileSystem.readAsStringAsync(uriString, {
        encoding: FileSystem.EncodingType.Base64,
      });
      processImage(base64);
    } else {
      // Web implementation using fetch and FileReader
      const response = await fetch(uriString);
      const blob = await response.blob();

      // Convert blob to base64 using FileReader
      const base64data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Remove the "data:image/...;base64," prefix
      const base64 = base64data.split(',')[1];
      if (base64) {
        processImage(base64);
      } else {
        console.error('Failed to extract base64 data from data URL.');
      }
    }
  } catch (error) {
    console.error('Error processing image:', error);
  }
};
