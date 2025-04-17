import { CanvasElements } from '@/constants/CanvasElement';
import { useFontManager } from '@/hooks/useFontManager';
import {
  PaintStyle,
  SkCanvas,
  Skia,
  SkPaint,
  Paragraph as SkParagraph,
  TextAlign,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface TextProps {
  textData: CanvasElements.Text;
}

export const Text: React.FC<TextProps> = React.memo(
  ({ textData: textData }) => {
    const { point, text, fontFamily, fontSize, fontStyle, fontWeight, color } =
      textData;

    const fontManager = useFontManager();

    const paragraph = useMemo(() => {
      if (!fontManager) {
        return null;
      }

      const paragraph = Skia.ParagraphBuilder.Make(
        { textAlign: TextAlign.Left },
        fontManager
      )
        .pushStyle({
          fontFamilies: [fontFamily],
          fontSize: fontSize,
          fontStyle: {
            weight: fontWeight as any,
            slant: fontStyle === 'italic' ? 1 : 0,
          },
          color: Skia.Color(color),
        })
        .addText(text)
        .build();
      return paragraph;
    }, [fontFamily, fontSize, fontStyle, fontWeight, text, fontManager, color]);

    const width = useMemo(() => {
      if (!paragraph) {
        return 0;
      }
      paragraph.layout(1000);
      return paragraph.getLongestLine() + 10;
    }, [paragraph]);
    return (
      <SkParagraph
        paragraph={paragraph}
        x={point.x}
        y={point.y}
        width={width}
      />
    );
  }
);

export const renderText = async (
  canvas: SkCanvas,
  paint: SkPaint,
  textData: CanvasElements.Text
) => {
  const { point, text, fontFamily, fontSize, fontStyle, fontWeight, color } =
    textData;

  // Determine font file based on style and weight (simplified example for Roboto)
  let fontFile;
  if (fontFamily === 'Roboto') {
    if (fontWeight === 'bold') {
      fontFile = require('@/assets/fonts/roboto/Roboto-Bold.ttf');
    } else if (fontStyle === 'italic') {
      fontFile = require('@/assets/fonts/roboto/Roboto-Italic.ttf');
    } else {
      fontFile = require('@/assets/fonts/roboto/Roboto-Regular.ttf');
    }
  } else {
    // Fallback or handle other font families
    fontFile = require('@/assets/fonts/roboto/Roboto-Regular.ttf');
  }

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
