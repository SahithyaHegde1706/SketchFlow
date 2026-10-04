import type { CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { SelectionSet } from "@/types/editor";
import type { CanvasSnapshot, HistoryState, SelectionSnapshot } from "./types";

const MAX_HISTORY = 100;

export function createSelectionSnapshot(
  strokes: FreehandStroke[],
  selection: SelectionSet,
): SelectionSnapshot[] {
  return selection.map(item => {
    if (item.kind === "stroke") {
      return { kind: "stroke", index: strokes.indexOf(item.value) };
    }
    if (item.kind === "group") {
      return { kind: "group", id: item.value.id };
    }
    return { kind: "element", id: item.value.id };
  });
}

export function createSnapshot(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  creationOrder: CreationRecord[],
  selection: SelectionSet = [],
  groups: Group[] = [],
): CanvasSnapshot {
  return {
    strokes: JSON.parse(JSON.stringify(strokes)),
    elements: JSON.parse(JSON.stringify(elements)),
    groups: JSON.parse(JSON.stringify(groups)),
    creationOrder: JSON.parse(JSON.stringify(creationOrder)),
    selection: createSelectionSnapshot(strokes, selection),
  };
}

export function createHistory(initialSnapshot: CanvasSnapshot): HistoryState {
  return {
    undoStack: [initialSnapshot],
    redoStack: [],
  };
}

export function record(
  history: HistoryState,
  newSnapshot: CanvasSnapshot,
): HistoryState {
  const currentSnapshot = history.undoStack[history.undoStack.length - 1];
  
  if (
    currentSnapshot && 
    JSON.stringify(currentSnapshot) === JSON.stringify(newSnapshot)
  ) {
    return history;
  }

  const newUndoStack = [...history.undoStack, newSnapshot];
  
  if (newUndoStack.length > MAX_HISTORY) {
    newUndoStack.shift();
  }

  return {
    undoStack: newUndoStack,
    redoStack: [],
  };
}
