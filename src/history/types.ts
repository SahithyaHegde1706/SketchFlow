import type { CreationRecord, FreehandStroke, WhiteboardElement } from "@/types/canvas";

export type CanvasSnapshot = {
  strokes: FreehandStroke[];
  elements: WhiteboardElement[];
  creationOrder: CreationRecord[];
};

export type HistoryState = {
  undoStack: CanvasSnapshot[];
  redoStack: CanvasSnapshot[];
};
