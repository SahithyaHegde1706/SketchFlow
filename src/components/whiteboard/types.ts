export type Point = {
  x: number;
  y: number;
};

export type FreehandStroke = Point[];

export type RectangleElement = {
  id: string;
  type: "rectangle";
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  strokeWidth: number;
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
};

export type WhiteboardElement = RectangleElement | CircleElement;

export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "circle"
  | "arrow"
  | "text"
  | "draw"
  | "eraser";
