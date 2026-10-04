import type { Point } from "./geometry";
export type FreehandStroke = Point[] & { locked?: boolean };
export type RectangleElement = {
  id: string;
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  rotation?: number;
  fillColor?: string | null;
  locked?: boolean;
};

export type CircleElement = {
  id: string;
  type: "circle";
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
  rotation?: number;
  fillColor?: string | null;
  locked?: boolean;
};

export type ArrowElement = {
  id: string;
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  strokeWidth: number;
  rotation?: number;
  locked?: boolean;
};

export type LineElement = {
  id: string;
  type: "line";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  strokeWidth: number;
  rotation?: number;
  locked?: boolean;
};

export type RoundedRectangleElement = {
  id: string;
  type: "roundedRectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string | null;
  rotation?: number;
  locked?: boolean;
};

export type TextElement = {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  strokeColor: string;
  rotation?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textAlign?: "left" | "center" | "right";
  lineHeight?: number;
  locked?: boolean;
};

export type ImageElement = {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  initialWidth?: number;
  initialHeight?: number;
  maintainAspectRatio?: boolean;
  rotation?: number;
  locked?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  opacity?: number;
  strokeColor?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

export type WhiteboardElement =
  | RectangleElement
  | RoundedRectangleElement
  | CircleElement
  | ArrowElement
  | LineElement
  | TextElement
  | ImageElement;

export type Group = {
  id: string;
  elementIds: string[];
  locked?: boolean;
};

export type CreationRecord =
  | { kind: "stroke"; value: FreehandStroke }
  | { kind: "element"; value: WhiteboardElement };

export type CanvasSettings = {
  backgroundColor: string;
  backgroundMode?: "theme-default" | "custom";
  showGrid: boolean;
  gridSize: number;
  snapSettings: SnapSettings;
};

export type SnapSettings = {
  enabled: boolean;
  gridEnabled: boolean;
  gridSize: number;
  threshold: number;
};