// Types for different canvas elements

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
  } & StrokeProps;

  export type Line = {
    startPoint: Point;
    endPoint: Point;
  } & StrokeProps;

  export type Rectangle = {
    point: Point;
    width: number;
    height: number;
  } & StrokeProps &
    FillProps;

  export type Triangle = {
    point1: Point;
    point2: Point;
    point3: Point;
  } & StrokeProps &
    FillProps;

  export type Circle = {
    center: Point;
    radius: number;
  } & StrokeProps &
    FillProps;

  export type Star = {
    point: Point;
    radius: number;
    spikes: number;
  } & StrokeProps &
    FillProps;

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

  export type Any =
    | Path
    | Line
    | Rectangle
    | Triangle
    | Circle
    | Star
    | Text
    | Image;
}
