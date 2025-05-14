// Types for different canvas elements
import { Tools } from './Tools'; // Added import for Tools

type Point = {
  x: number;
  y: number;
};

export namespace CanvasElements {
  // Common shared attributes
  export type StrokeProps = {
    strokeWidth: number;
    strokeColor: string;
  };

  export type FillProps = {
    fillColor?: string;
  };

  export type Path = {
    points: Point[];
    capStyle?: 'butt' | 'round' | 'square';
    blendMode?: 'srcOver' | 'clear';
    closed?: boolean; // Added for closed shapes like rectangles, stars
  } & StrokeProps &
    FillProps; // Added FillProps here for consistency, shapes can have fills

  export type Line = {
    startPoint: Point;
    endPoint: Point;
  } & StrokeProps;

  export type Text = {
    point: Point;
    text: string;
    fontFamily: string;
    fontSize: number;
    fontStyle?: 'normal' | 'italic' | 'oblique';
    fontWeight?: // Stolen from react-native-skia font.d.ts
    | 'normal'
      | 'bold'
      | '100'
      | '200'
      | '300'
      | '400'
      | '500'
      | '600'
      | '700'
      | '800'
      | '900';
    color: string;
  };

  export type Image = {
    point: Point;
    width: number;
    height: number;
    uri: any; // Ether load using require('path/to/image.png') or uri from network
  };

  export type Emoji = {
    point: Point;
    emoji: string; // The emoji character itself, e.g., "😀"
    size: number; // Font size for the emoji
  };

  export type Any =
    | Path
    | Line
    | Rectangle
    | Triangle
    | Circle
    | Star
    | Text
    | Image
    | Emoji; // Add Emoji here
}

// Moved CanvasElement type definition here
export type CanvasElement = {
  id: string;
  element: CanvasElements.Any;
  tool: Tools;
  rotation?: number;
};
