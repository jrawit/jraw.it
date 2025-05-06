import { CanvasElements } from '@/constants/CanvasElement';
import { getFontFile, useFontManager } from '@/hooks/useFontManager';
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

      // Convert string weight values to numeric values that Skia understands
      let numericWeight = 400; // Default to regular (400)
      if (fontWeight === 'bold') {
        numericWeight = 700;
      } else if (fontWeight === 'normal') {
        numericWeight = 400;
      } else if (fontWeight && !isNaN(Number(fontWeight))) {
        // If it's already a numeric string like '500', convert to number
        numericWeight = Number(fontWeight);
      }

      const paragraph = Skia.ParagraphBuilder.Make(
        { textAlign: TextAlign.Left },
        fontManager
      )
        .pushStyle({
          fontFamilies: [fontFamily],
          fontSize: fontSize,
          fontStyle: {
            weight: numericWeight,
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
