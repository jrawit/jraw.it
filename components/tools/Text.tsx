import { CanvasElements } from '@/constants/CanvasElement';
import { useFontManager } from '@/hooks/useFontManager';
import {
  Skia,
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
    }, [fontFamily, fontSize, fontStyle, fontWeight, text, fontManager]);

    const width = useMemo(() => {
      if (!paragraph) {
        return 0;
      }
      paragraph.layout(1000);
      return paragraph.getLongestLine() + 20;
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
