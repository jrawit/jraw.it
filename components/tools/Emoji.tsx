import { CanvasElements } from '@/constants/CanvasElement';
import { getFontFile, useFontManager } from '@/hooks/useFontManager';
import {
  SkCanvas,
  Skia,
  SkPaint,
  Paragraph as SkParagraph,
  TextAlign,
} from '@shopify/react-native-skia';
import React, { useMemo } from 'react';

interface EmojiProps {
  emojiData: CanvasElements.Emoji;
}

export const Emoji: React.FC<EmojiProps> = React.memo(
  ({ emojiData: emojiData }) => {
    const { point, emoji, size } = emojiData;

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
          fontFamilies: ['TwitterColorEmoji'],
          fontSize: size,
        })
        .addText(emoji)
        .build();
      return paragraph;
    }, [fontManager, emoji, size]);

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

export const renderEmoji = async (
  canvas: SkCanvas,
  paint: SkPaint,
  emojiData: CanvasElements.Emoji
) => {
  const { point, emoji, size } = emojiData;

  // Use the centralized getFontFile function instead of inline font selection logic
  const fontFile = getFontFile('TwitterColorEmoji', undefined, undefined);

  const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
    await Skia.Data.fromURI(fontFile)
  );

  if (!typeface) {
    console.error(
      'Failed to load typeface for TwitterColorEmoji. Ensure the font file is correctly loaded.'
    );
    return;
  }

  const font = Skia.Font(typeface, size);

  canvas.drawText(emoji, point.x, point.y + size, paint, font);
};
