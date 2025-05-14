import { CanvasElements } from '@/constants/CanvasElement';
import { CanvasElement } from '@/hooks/useCanvas';
import { getFontFile } from '@/hooks/useFontManager';
import {
  Group,
  PaintStyle,
  SkCanvas,
  Skia,
  Text as SkiaText,
  SkPaint,
} from '@shopify/react-native-skia';
import React from 'react';

interface TextProps {
  textData: CanvasElements.Text;
  elementData?: CanvasElement;
}

export const Text: React.FC<TextProps> = ({ textData, elementData }) => {
  const rotation = elementData?.rotation || 0;

  // Calculate center for rotation transform
  const fontSize = textData.fontSize || 20;
  const approximateWidth = textData.text.length * fontSize * 0.6; // Estimate width
  const approximateHeight = fontSize * 1.2; // Estimate height

  const centerX = textData.point.x + approximateWidth / 2;
  const centerY = textData.point.y + approximateHeight / 2;

  return (
    <Group
      transform={
        rotation
          ? [
              { translateX: centerX },
              { translateY: centerY },
              { rotate: rotation },
              { translateX: -centerX },
              { translateY: -centerY },
            ]
          : undefined
      }
    >
      <SkiaText
        x={textData.point.x}
        y={textData.point.y + fontSize} // Add fontSize to y to position correctly
        text={textData.text}
        font={{ family: textData.fontFamily, size: fontSize }}
        color={textData.color}
      />
    </Group>
  );
};

export const renderText = async (
  canvas: SkCanvas,
  paint: SkPaint,
  textData: CanvasElements.Text
) => {
  const { point, text, fontFamily, fontSize, fontStyle, fontWeight, color } =
    textData;

  // Use the centralized getFontFile function instead of inline font selection logic
  const fontFile = getFontFile(fontFamily, fontWeight, fontStyle);

  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
    await Skia.Data.fromURI(fontFile)
  );

  if (!typeface) {
    console.error(
      'Failed to load typeface for',
      fontFamily,
      fontWeight,
      fontStyle
    );
    return;
  }

  const font = Skia.Font(typeface, fontSize);

  // Set text color
  paint.setColor(Skia.Color(color));
  paint.setStyle(PaintStyle.Fill); // Ensure paint style is Fill for text

  canvas.drawText(
    text,
    point.x,
    point.y + fontSize, // Basic baseline adjustment, might need refinement
    paint,
    font
  );
};
