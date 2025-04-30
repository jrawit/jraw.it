import Entypo from '@expo/vector-icons/build/Entypo';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

export enum Tools {
  PEN = 'pen',
  LINE = 'line',
  HIGHLIGHTER = 'highlighter',
  ERASER = 'eraser',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  TRIANGLE = 'triangle',
  STAR = 'star',
  SELECT = 'select',
  PAN = 'pan',
  TEXT = 'text',
  IMAGE = 'image',
}

// Get icons from https://icons.expo.fyi/

export const ToolData = {
  [Tools.PAN]: {
    iconComponent: MaterialCommunityIcons,
    iconName: 'hand-back-right-outline',
  },
  [Tools.SELECT]: {
    iconComponent: MaterialCommunityIcons,
    iconName: 'cursor-default-outline',
  },
  [Tools.PEN]: {
    cap: 'round' as const,
    iconComponent: FontAwesome5,
    iconName: 'pen',
    blendMode: 'srcOver' as const,
    colorTransform: (hex: string) => hex, // No transformation
    sizeTransform: (size: number) => size, // No transformation
  },
  [Tools.HIGHLIGHTER]: {
    cap: 'square' as const,
    iconComponent: FontAwesome5,
    iconName: 'highlighter',
    blendMode: 'srcOver' as const,
    colorTransform: (hex: string) => {
      const alpha = 0.4;
      // Convert alpha (0-1) to hex (00-FF)
      const alphaHex = Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0');
      // Append alpha hex to the original hex color (removing the '#')
      return `${hex}${alphaHex}`;
    },
    sizeTransform: (size: number) => size + 10,
  },
  [Tools.ERASER]: {
    cap: 'round' as const,
    iconComponent: Entypo,
    iconName: 'eraser',
    blendMode: 'clear' as const,
    colorTransform: (hex: string) => hex, // No transformation
    sizeTransform: (size: number) => size, // No transformation
  },
  [Tools.TEXT]: {
    iconComponent: MaterialIcons,
    iconName: 'text-fields',
  },
  [Tools.LINE]: {
    iconComponent: MaterialCommunityIcons,
    iconName: 'vector-line',
  },
  [Tools.CIRCLE]: {
    iconComponent: Feather,
    iconName: 'circle',
  },
  [Tools.RECTANGLE]: {
    iconComponent: Feather,
    iconName: 'square',
  },
  [Tools.TRIANGLE]: {
    iconComponent: Feather,
    iconName: 'triangle',
  },
  [Tools.STAR]: {
    iconComponent: Feather,
    iconName: 'star',
  },
};
