import type { CreationRecord, FreehandStroke, WhiteboardElement } from "@/types/canvas";

export type SelectionSnapshot =
  | { kind: "stroke"; index: number }
  | { kind: "element"; id: string };

export type CanvasSnapshot = {
  strokes: FreehandStroke[];
  elements: WhiteboardElement[];
  creationOrder: CreationRecord[];
  selection: SelectionSnapshot[];
};

export type HistoryState = {
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
};
