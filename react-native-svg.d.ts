declare module 'react-native-svg' {
  import * as React from 'react';
  import { ViewStyle, StyleProp } from 'react-native';

  interface SvgProps {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    style?: StyleProp<ViewStyle>;
    children?: React.ReactNode;
  }

  interface CircleProps {
    cx: number | string;
    cy: number | string;
    r: number | string;
    stroke?: string;
    strokeWidth?: number | string;
    fill?: string;
    strokeDasharray?: number | string;
    strokeDashoffset?: number | string;
    strokeLinecap?: 'butt' | 'round' | 'square';
    transform?: string;
  }

  const Svg: React.FC<SvgProps>;
  const Circle: React.FC<CircleProps>;
  const Rect: React.FC<any>;
  const Path: React.FC<any>;
  const G: React.FC<any>;
  const Line: React.FC<any>;
  const Polyline: React.FC<any>;
  const Polygon: React.FC<any>;
  const Text: React.FC<any>;
  const Defs: React.FC<any>;
  const LinearGradient: React.FC<any>;
  const RadialGradient: React.FC<any>;
  const Stop: React.FC<any>;
  const ClipPath: React.FC<any>;
  const Ellipse: React.FC<any>;

  export { Svg, Circle, Rect, Path, G, Line, Polyline, Polygon, Text, Defs, LinearGradient, RadialGradient, Stop, ClipPath, Ellipse };
  export default Svg;
}
