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
    color: 'black',
    cap: 'round' as const,
    iconComponent: FontAwesome5,
    iconName: 'pen',
    blendMode: 'srcOver' as const,
  },
  [Tools.LINE]: {
    color: 'black',
    cap: 'round' as const,
    iconComponent: MaterialCommunityIcons,
    iconName: 'vector-line',
    blendMode: 'srcOver' as const,
  },
  [Tools.HIGHLIGHTER]: {
    color: 'rgba(255, 255, 0, 0.4)',
    cap: 'square' as const,
    iconComponent: FontAwesome5,
    iconName: 'highlighter',
    blendMode: 'srcOver' as const,
  },
  [Tools.ERASER]: {
    color: 'transparent',
    cap: 'round' as const,
    iconComponent: Entypo,
    iconName: 'eraser',
    blendMode: 'clear' as const,
  },
  [Tools.BUCKETFILL]: {
    color: 'lightblue',
    cap: 'round' as const,
    iconComponent: FontAwesome5,
    iconName: 'fill',
    blendMode: 'srcOver' as const,
  },
  [Tools.CIRCLE]: {
    color: 'black',
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'circle',
    blendMode: 'srcOver' as const,
  },
  [Tools.RECTANGLE]: {
    color: 'black',
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'square',
    blendMode: 'srcOver' as const,
  },
  [Tools.TRIANGLE]: {
    color: 'black',
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'triangle',
    blendMode: 'srcOver' as const,
  },
  [Tools.STAR]: {
    color: 'black',
    cap: 'round' as const,
    iconComponent: Feather,
    iconName: 'star',
    blendMode: 'srcOver' as const,
  },
};
