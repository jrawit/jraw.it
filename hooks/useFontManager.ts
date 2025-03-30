// @ts-nocheck
import { useFonts } from '@shopify/react-native-skia';
import { Platform } from 'react-native';

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
          default: require('@/assets/fonts/montserrat/Montserrat-Regular.otf'),
        },
        { default: require('@/assets/fonts/montserrat/Montserrat-Italic.otf') },
        { default: require('@/assets/fonts/montserrat/Montserrat-Bold.otf') },
      ],
      OpenSans: [
        { default: require('@/assets/fonts/open-sans/OpenSans-Regular.ttf') },
        { default: require('@/assets/fonts/open-sans/OpenSans-Italic.ttf') },
        { default: require('@/assets/fonts/open-sans/OpenSans-Bold.ttf') },
      ],
      Raleway: [
        { default: require('@/assets/fonts/raleway/Raleway-Regular.ttf') },
        { default: require('@/assets/fonts/raleway/Raleway-Italic.ttf') },
        { default: require('@/assets/fonts/raleway/Raleway-Bold.ttf') },
      ],
      Roboto: [
        { default: require('@/assets/fonts/roboto/Roboto-Regular.ttf') },
        { default: require('@/assets/fonts/roboto/Roboto-Italic.ttf') },
        { default: require('@/assets/fonts/roboto/Roboto-Bold.ttf') },
      ],
    });
  } else {
    // Native platforms version
    fontMgr = useFonts({
      Montserrat: [
        require('@/assets/fonts/montserrat/Montserrat-Regular.otf'),
        require('@/assets/fonts/montserrat/Montserrat-Italic.otf'),
        require('@/assets/fonts/montserrat/Montserrat-Bold.otf'),
      ],
      OpenSans: [
        require('@/assets/fonts/open-sans/OpenSans-Regular.ttf'),
        require('@/assets/fonts/open-sans/OpenSans-Italic.ttf'),
        require('@/assets/fonts/open-sans/OpenSans-Bold.ttf'),
      ],
      Raleway: [
        require('@/assets/fonts/raleway/Raleway-Regular.ttf'),
        require('@/assets/fonts/raleway/Raleway-Italic.ttf'),
        require('@/assets/fonts/raleway/Raleway-Bold.ttf'),
      ],
      Roboto: [
        require('@/assets/fonts/roboto/Roboto-Regular.ttf'),
        require('@/assets/fonts/roboto/Roboto-Italic.ttf'),
        require('@/assets/fonts/roboto/Roboto-Bold.ttf'),
      ],
    });
  }

  return fontMgr;
}
