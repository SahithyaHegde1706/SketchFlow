export type Point = {
  x: number;
  y: number;
};

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

export type WhiteboardElement =
  | RectangleElement
  | RoundedRectangleElement
  | CircleElement
  | ArrowElement
  | LineElement
  | TextElement;

export type Group = {
  id: string;
  elementIds: string[];
  locked?: boolean;
};

export type Selection =
  | { kind: "stroke"; value: FreehandStroke }
  | { kind: "element"; value: WhiteboardElement }
  | { kind: "group"; value: Group };

export type SelectionSet = Selection[];

export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "roundedRectangle"
  | "circle"
  | "arrow"
  | "line"
  | "text"
  | "draw"
  | "eraser";

export type TextEditorState = {
  x: number;
  y: number;
  value: string;
};

export type CreationRecord =
  | { kind: "stroke"; value: FreehandStroke }
  | { kind: "element"; value: WhiteboardElement };

export type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "rotate";

export type DragState = {
  selection: Selection;
  pointerStart: Point;
  original: FreehandStroke | WhiteboardElement | Group;
  type: "move" | "resize";
  handle?: ResizeHandle;
};

export type MultiDragState = {
  selections: Selection[];
  originals: (FreehandStroke | WhiteboardElement | Group)[];
  pointerStart: Point;
  clicked: Selection;
  moved: boolean;
};

export type Bounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type Viewport = {
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type PanState = {
  pointerStartX: number;
  pointerStartY: number;
  originOffsetX: number;
  originOffsetY: number;
};

export type CanvasSettings = {
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
};

export type RotationState = {
  selections: Selection[];
  originals: (FreehandStroke | WhiteboardElement | Group)[];
  originalElements: WhiteboardElement[];
  centerX: number;
  centerY: number;
  initialPointerAngle: number;
  moved: boolean;
};

export type AlignOperation =
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-top"
  | "align-middle"
  | "align-bottom"
  | "distribute-horizontal"
  | "distribute-vertical";

export type MarqueeState = {
  /** X coordinate of where the drag started, in logical (canvas) coordinates. */
  startX: number;
  /** Y coordinate of where the drag started, in logical (canvas) coordinates. */
  startY: number;
  /** Current X coordinate of the pointer, in logical (canvas) coordinates. */
  currentX: number;
  /** Current Y coordinate of the pointer, in logical (canvas) coordinates. */
  currentY: number;
};
