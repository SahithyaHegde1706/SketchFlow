import type { CreationRecord, FreehandStroke, WhiteboardElement } from "@/types/canvas";
import type { CanvasSnapshot, HistoryState } from "./types";

const MAX_HISTORY = 100;

export function createSnapshot(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  creationOrder: CreationRecord[],
): CanvasSnapshot {
  return {
    strokes: JSON.parse(JSON.stringify(strokes)),
    elements: JSON.parse(JSON.stringify(elements)),
    creationOrder: JSON.parse(JSON.stringify(creationOrder)),
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

export function canUndo(history: HistoryState): boolean {
  return history.undoStack.length > 1; // Always keep the initial empty state
}

export function canRedo(history: HistoryState): boolean {
  return history.redoStack.length > 0;
}

export function undo(history: HistoryState): { newHistory: HistoryState; snapshot: CanvasSnapshot | null } {
  if (!canUndo(history)) {
    return { newHistory: history, snapshot: null };
  }

  const currentSnapshot = history.undoStack[history.undoStack.length - 1];
  const newUndoStack = history.undoStack.slice(0, -1);
  const previousSnapshot = newUndoStack[newUndoStack.length - 1];
  
  return {
    newHistory: {
      undoStack: newUndoStack,
      redoStack: [currentSnapshot, ...history.redoStack],
    },
    snapshot: previousSnapshot,
  };
}

export function redo(history: HistoryState): { newHistory: HistoryState; snapshot: CanvasSnapshot | null } {
  if (!canRedo(history)) {
    return { newHistory: history, snapshot: null };
  }

  const nextSnapshot = history.redoStack[0];
  const newRedoStack = history.redoStack.slice(1);
  
  return {
    newHistory: {
      undoStack: [...history.undoStack, nextSnapshot],
      redoStack: newRedoStack,
    },
    snapshot: nextSnapshot,
  };
}
