import type { FreehandStroke, Group, ImageElement, WhiteboardElement } from "./canvas";
import type { Bounds, CropHandle, Point, ResizeHandle } from "./geometry";

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
  | "image"
  | "draw"
  | "eraser";

export type TextEditorState = {
  x: number;
  y: number;
  value: string;
};

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
  originalBounds?: Bounds;
};

export type PanState = {
  pointerStartX: number;
  pointerStartY: number;
  originOffsetX: number;
  originOffsetY: number;
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

export type CropState = {
  element: ImageElement;
  left: number;
  top: number;
  right: number;
  bottom: number;
  activeHandle?: CropHandle;
  pointerStart?: Point;
  initialCrop?: { left: number; top: number; right: number; bottom: number };
};
