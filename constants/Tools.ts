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
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  [Tools.SELECT]: {
    iconComponent: MaterialCommunityIcons,
    iconName: 'select',
  },
  [Tools.TEXT]: {
    iconComponent: MaterialIcons,
    iconName: 'text-fields',
  },
};
