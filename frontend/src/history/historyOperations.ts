import type { CanvasSnapshot, HistoryState } from "./types";

export function canUndo(history: HistoryState): boolean {
  return history.undoStack.length > 1; // Always keep the initial empty state
}

export function canRedo(history: HistoryState): boolean {
  return history.redoStack.length > 0;
}

export function rebaseHistorySnapshots(
  history: HistoryState,
  updateSnapshot: (snapshot: CanvasSnapshot) => CanvasSnapshot,
): HistoryState {
  return {
    undoStack: history.undoStack.map(updateSnapshot),
    redoStack: history.redoStack.map(updateSnapshot),
  };
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
