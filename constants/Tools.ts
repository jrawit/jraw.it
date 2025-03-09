import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Entypo from '@expo/vector-icons/build/Entypo';

export enum Tools {
  PEN = 'pen',
  LINE = 'line',
  HIGHLIGHTER = 'highlighter',
  ERASER = 'eraser',
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
};
