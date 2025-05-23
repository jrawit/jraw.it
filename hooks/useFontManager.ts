// @ts-nocheck
import { useFonts } from '@shopify/react-native-skia';
import { useMemo } from 'react';
import { Platform } from 'react-native';

export const Fonts = ['Montserrat', 'OpenSans', 'Raleway', 'Roboto'] as const;

// Font path constants to avoid repetition and improve maintainability
const FONT_PATHS = {
  Montserrat: {
    Regular: require('@/assets/fonts/montserrat/Montserrat-Regular.ttf'),
    Italic: require('@/assets/fonts/montserrat/Montserrat-Italic.ttf'),
    Bold: require('@/assets/fonts/montserrat/Montserrat-Bold.ttf'),
    BoldItalic: require('@/assets/fonts/montserrat/Montserrat-BoldItalic.ttf'),
  },
  OpenSans: {
    Regular: require('@/assets/fonts/open-sans/OpenSans-Regular.ttf'),
    Italic: require('@/assets/fonts/open-sans/OpenSans-Italic.ttf'),
    Bold: require('@/assets/fonts/open-sans/OpenSans-Bold.ttf'),
    BoldItalic: require('@/assets/fonts/open-sans/OpenSans-BoldItalic.ttf'),
  },
  Raleway: {
    Regular: require('@/assets/fonts/raleway/Raleway-Regular.ttf'),
    Italic: require('@/assets/fonts/raleway/Raleway-Italic.ttf'),
    Bold: require('@/assets/fonts/raleway/Raleway-Bold.ttf'),
    BoldItalic: require('@/assets/fonts/raleway/Raleway-BoldItalic.ttf'),
  },
  Roboto: {
    Regular: require('@/assets/fonts/roboto/Roboto-Regular.ttf'),
    Italic: require('@/assets/fonts/roboto/Roboto-Italic.ttf'),
    Bold: require('@/assets/fonts/roboto/Roboto-Bold.ttf'),
    BoldItalic: require('@/assets/fonts/roboto/Roboto-BoldItalic.ttf'),
  },
  TwitterColorEmoji: {
    Regular: require('@/assets/fonts/TwitterColorEmoji.ttf'),
  },
} as const;

/**
 * Get the appropriate font variant key based on style and weight
 */
function getFontVariant(
  fontWeight?: string | number,
  fontStyle?: string
): keyof typeof FONT_PATHS.Montserrat {
  // Convert numeric string weights to their equivalent styles
  const normalizedWeight =
    typeof fontWeight === 'string' && !isNaN(Number(fontWeight))
      ? Number(fontWeight)
      : fontWeight;

  // Bold italic combinations
  const isBold =
    normalizedWeight != null &&
    (normalizedWeight === 'bold' ||
      (typeof normalizedWeight === 'number' && normalizedWeight >= 700));
  const isItalic = fontStyle === 'italic';

  if (isBold && isItalic) return 'BoldItalic';
  if (isBold) return 'Bold';
  if (isItalic) return 'Italic';
  return 'Regular';
}

/**
 * Get the appropriate font file path based on font family, style and weight
 * @param fontFamily The font family name
 * @param fontWeight The font weight
 * @param fontStyle The font style
 * @returns The font file path
 */
export function getFontFile(
  fontFamily: string,
  fontWeight?: string | number,
  fontStyle?: string
) {
  const variant = getFontVariant(fontWeight, fontStyle);

  // Handle special case for TwitterColorEmoji
  if (fontFamily === 'TwitterColorEmoji') {
    return FONT_PATHS.TwitterColorEmoji.Regular;
  }

  // Get font family paths or default to Roboto
  const familyPaths =
    FONT_PATHS[fontFamily as keyof typeof FONT_PATHS] || FONT_PATHS.Roboto;

  // Return the specific variant or fall back to Regular
  return familyPaths[variant] || familyPaths.Regular;
}

/**
 * Generate font configuration for web platform
 */
const getWebFontConfig = () => ({
  Montserrat: [
    { default: FONT_PATHS.Montserrat.Regular },
    { default: FONT_PATHS.Montserrat.Italic },
    { default: FONT_PATHS.Montserrat.Bold },
    { default: FONT_PATHS.Montserrat.BoldItalic },
  ],
  OpenSans: [
    { default: FONT_PATHS.OpenSans.Regular },
    { default: FONT_PATHS.OpenSans.Italic },
    { default: FONT_PATHS.OpenSans.Bold },
    { default: FONT_PATHS.OpenSans.BoldItalic },
  ],
  Raleway: [
    { default: FONT_PATHS.Raleway.Regular },
    { default: FONT_PATHS.Raleway.Italic },
    { default: FONT_PATHS.Raleway.Bold },
    { default: FONT_PATHS.Raleway.BoldItalic },
  ],
  Roboto: [
    { default: FONT_PATHS.Roboto.Regular },
    { default: FONT_PATHS.Roboto.Italic },
    { default: FONT_PATHS.Roboto.Bold },
    { default: FONT_PATHS.Roboto.BoldItalic },
  ],
  TwitterColorEmoji: [{ default: FONT_PATHS.TwitterColorEmoji.Regular }],
});

/**
 * Generate font configuration for native platforms
 */
const getNativeFontConfig = () => ({
  Montserrat: [
    FONT_PATHS.Montserrat.Regular,
    FONT_PATHS.Montserrat.Italic,
    FONT_PATHS.Montserrat.Bold,
    FONT_PATHS.Montserrat.BoldItalic,
  ],
  OpenSans: [
    FONT_PATHS.OpenSans.Regular,
    FONT_PATHS.OpenSans.Italic,
    FONT_PATHS.OpenSans.Bold,
    FONT_PATHS.OpenSans.BoldItalic,
  ],
  Raleway: [
    FONT_PATHS.Raleway.Regular,
    FONT_PATHS.Raleway.Italic,
    FONT_PATHS.Raleway.Bold,
    FONT_PATHS.Raleway.BoldItalic,
  ],
  Roboto: [
    FONT_PATHS.Roboto.Regular,
    FONT_PATHS.Roboto.Italic,
    FONT_PATHS.Roboto.Bold,
    FONT_PATHS.Roboto.BoldItalic,
  ],
  TwitterColorEmoji: [FONT_PATHS.TwitterColorEmoji.Regular],
});

/**
 * Custom hook to load and manage fonts from Skia
 * @returns Font manager object with font families
 */
export function useFontManager() {
  // Memoize font configuration based on platform to avoid recreation
  const fontConfig = useMemo(() => {
    return Platform.OS === 'web' ? getWebFontConfig() : getNativeFontConfig();
  }, []);

  // Use the memoized font configuration
  const fontMgr = useFonts(fontConfig);

  return fontMgr;
}
