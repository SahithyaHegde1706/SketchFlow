import type { CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";

export type SelectionSnapshot =
  | { kind: "stroke"; index: number }
  | { kind: "element"; id: string }
  | { kind: "group"; id: string };

export type CanvasSnapshot = {
  strokes: FreehandStroke[];
  elements: WhiteboardElement[];
  groups: Group[];
  creationOrder: CreationRecord[];
  selection: SelectionSnapshot[];
};

export type HistoryState = {
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
};
