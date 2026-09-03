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

export type ArrowElement = {
  id: string;
  type: "arrow";
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  strokeColor: string;
  strokeWidth: number;
};

export type TextElement = {
  id: string;
  type: "text";
  x: number;
  y: number;
  text: string;
  fontSize: number;
  strokeColor: string;
};

export type WhiteboardElement =
  | RectangleElement
  | CircleElement
  | ArrowElement
  | TextElement;

export type Selection =
  | { kind: "stroke"; value: FreehandStroke }
  | { kind: "element"; value: WhiteboardElement };

export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "circle"
  | "arrow"
  | "text"
  | "draw"
  | "eraser";
