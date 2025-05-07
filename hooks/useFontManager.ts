// @ts-nocheck
import { useFonts } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

export const Fonts = ['Montserrat', 'OpenSans', 'Raleway', 'Roboto'] as const;

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
  // Default to regular font if family is not supported
  let fontFile = require('@/assets/fonts/roboto/Roboto-Regular.ttf');

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

  switch (fontFamily) {
    case 'Montserrat':
      if (isBold && isItalic) {
        fontFile = require('@/assets/fonts/montserrat/Montserrat-BoldItalic.ttf');
      } else if (isBold) {
        fontFile = require('@/assets/fonts/montserrat/Montserrat-Bold.ttf');
      } else if (isItalic) {
        fontFile = require('@/assets/fonts/montserrat/Montserrat-Italic.ttf');
      } else {
        fontFile = require('@/assets/fonts/montserrat/Montserrat-Regular.ttf');
      }
      break;
    case 'OpenSans':
      if (isBold && isItalic) {
        fontFile = require('@/assets/fonts/open-sans/OpenSans-BoldItalic.ttf');
      } else if (isBold) {
        fontFile = require('@/assets/fonts/open-sans/OpenSans-Bold.ttf');
      } else if (isItalic) {
        fontFile = require('@/assets/fonts/open-sans/OpenSans-Italic.ttf');
      } else {
        fontFile = require('@/assets/fonts/open-sans/OpenSans-Regular.ttf');
      }
      break;
    case 'Raleway':
      if (isBold && isItalic) {
        fontFile = require('@/assets/fonts/raleway/Raleway-BoldItalic.ttf');
      } else if (isBold) {
        fontFile = require('@/assets/fonts/raleway/Raleway-Bold.ttf');
      } else if (isItalic) {
        fontFile = require('@/assets/fonts/raleway/Raleway-Italic.ttf');
      } else {
        fontFile = require('@/assets/fonts/raleway/Raleway-Regular.ttf');
      }
      break;
    case 'Roboto':
      if (isBold && isItalic) {
        fontFile = require('@/assets/fonts/roboto/Roboto-BoldItalic.ttf');
      } else if (isBold) {
        fontFile = require('@/assets/fonts/roboto/Roboto-Bold.ttf');
      } else if (isItalic) {
        fontFile = require('@/assets/fonts/roboto/Roboto-Italic.ttf');
      } else {
        fontFile = require('@/assets/fonts/roboto/Roboto-Regular.ttf');
      }
      break;
    default:
      // Default to Roboto Regular for unsupported fonts
      fontFile = require('@/assets/fonts/roboto/Roboto-Regular.ttf');
  }

  return fontFile;
}

/**
 * Custom hook to load and manage fonts from Skia
 * @returns Font manager object with font families
 */
export function useFontManager() {
  let fontMgr;

  if (Platform.OS === 'web') {
    // Web version
    fontMgr = useFonts({
      Montserrat: [
        {
          default: require('@/assets/fonts/montserrat/Montserrat-Regular.ttf'),
        },
        { default: require('@/assets/fonts/montserrat/Montserrat-Italic.ttf') },
        { default: require('@/assets/fonts/montserrat/Montserrat-Bold.ttf') },
        {
          default: require('@/assets/fonts/montserrat/Montserrat-BoldItalic.ttf'),
        },
      ],
      OpenSans: [
        { default: require('@/assets/fonts/open-sans/OpenSans-Regular.ttf') },
        { default: require('@/assets/fonts/open-sans/OpenSans-Italic.ttf') },
        { default: require('@/assets/fonts/open-sans/OpenSans-Bold.ttf') },
        {
          default: require('@/assets/fonts/open-sans/OpenSans-BoldItalic.ttf'),
        },
      ],
      Raleway: [
        { default: require('@/assets/fonts/raleway/Raleway-Regular.ttf') },
        { default: require('@/assets/fonts/raleway/Raleway-Italic.ttf') },
        { default: require('@/assets/fonts/raleway/Raleway-Bold.ttf') },
        { default: require('@/assets/fonts/raleway/Raleway-BoldItalic.ttf') },
      ],
      Roboto: [
        { default: require('@/assets/fonts/roboto/Roboto-Regular.ttf') },
        { default: require('@/assets/fonts/roboto/Roboto-Italic.ttf') },
        { default: require('@/assets/fonts/roboto/Roboto-Bold.ttf') },
        { default: require('@/assets/fonts/roboto/Roboto-BoldItalic.ttf') },
      ],
    });
  } else {
    // Native platforms version
    fontMgr = useFonts({
      Montserrat: [
        require('@/assets/fonts/montserrat/Montserrat-Regular.ttf'),
        require('@/assets/fonts/montserrat/Montserrat-Italic.ttf'),
        require('@/assets/fonts/montserrat/Montserrat-Bold.ttf'),
        require('@/assets/fonts/montserrat/Montserrat-BoldItalic.ttf'),
      ],
      OpenSans: [
        require('@/assets/fonts/open-sans/OpenSans-Regular.ttf'),
        require('@/assets/fonts/open-sans/OpenSans-Italic.ttf'),
        require('@/assets/fonts/open-sans/OpenSans-Bold.ttf'),
        require('@/assets/fonts/open-sans/OpenSans-BoldItalic.ttf'),
      ],
      Raleway: [
        require('@/assets/fonts/raleway/Raleway-Regular.ttf'),
        require('@/assets/fonts/raleway/Raleway-Italic.ttf'),
        require('@/assets/fonts/raleway/Raleway-Bold.ttf'),
        require('@/assets/fonts/raleway/Raleway-BoldItalic.ttf'),
      ],
      Roboto: [
        require('@/assets/fonts/roboto/Roboto-Regular.ttf'),
        require('@/assets/fonts/roboto/Roboto-Italic.ttf'),
        require('@/assets/fonts/roboto/Roboto-Bold.ttf'),
        require('@/assets/fonts/roboto/Roboto-BoldItalic.ttf'),
      ],
    });
  }

  return fontMgr;
}
