import Entypo from '@expo/vector-icons/build/Entypo';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export enum Tools {
  PEN = 'pen',
  LINE = 'line',
  HIGHLIGHTER = 'highlighter',
  ERASER = 'eraser',
  BUCKETFILL = 'bucketfill',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  TRIANGLE = 'triangle',
  STAR = 'star',
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
  [Tools.LINE]: {
    cap: 'round' as const,
    iconComponent: MaterialCommunityIcons,
    iconName: 'vector-line',
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
  [Tools.BUCKETFILL]: {
    cap: 'round' as const,
    iconComponent: FontAwesome5,
    iconName: 'fill',
    blendMode: 'srcOver' as const,
    colorTransform: (hex: string) => hex, // No transformation
    sizeTransform: (size: number) => size, // No transformation
  },
  [Tools.CIRCLE]: {
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'circle',
    blendMode: 'srcOver' as const,
    colorTransform: (hex: string) => hex, // No transformation
    sizeTransform: (size: number) => size, // No transformation
  },
  [Tools.RECTANGLE]: {
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'square',
    blendMode: 'srcOver' as const,
    colorTransform: (hex: string) => hex, // No transformation
    sizeTransform: (size: number) => size, // No transformation
  },
  [Tools.TRIANGLE]: {
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'triangle',
    blendMode: 'srcOver' as const,
    colorTransform: (hex: string) => hex, // No transformation
    sizeTransform: (size: number) => size, // No transformation
  },
  [Tools.STAR]: {
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'star',
    blendMode: 'srcOver' as const,
    colorTransform: (hex: string) => hex, // No transformation
    sizeTransform: (size: number) => size, // No transformation
  },
};
