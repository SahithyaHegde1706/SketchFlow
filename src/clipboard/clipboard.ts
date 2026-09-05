import type { Selection, SelectionSet, WhiteboardElement } from "@/types/canvas";
import type { ClipboardState } from "./types";

export function copyToClipboard(selection: SelectionSet): ClipboardState {
  if (selection.length === 0) {
    return { item: null };
  }

  // Deep clone to safely disconnect object references
  return {
    item: JSON.parse(JSON.stringify(selection)),
  };
}

export function getClipboard(state: ClipboardState): SelectionSet | null {
  if (!state.item) {
    return null;
  }
  
  // Return deep clone to prevent accidental mutations by caller
  return JSON.parse(JSON.stringify(state.item));
}

export function offsetSelection(selection: Selection, offsetAmount: number = 20): Selection {
  if (selection.kind === "stroke") {
    // Strokes don't have IDs. Offset every point by offsetAmount.
    return {
      kind: "stroke",
      value: selection.value.map(point => ({
        x: point.x + offsetAmount,
        y: point.y + offsetAmount,
      })),
    };
  }

  // It's a structured element, offset position and create a new UUID
  const element = selection.value;
  let newElement: WhiteboardElement;
  const newId = crypto.randomUUID();

  if (element.type === "rectangle" || element.type === "circle" || element.type === "text") {
    newElement = {
      ...element,
      id: newId,
      x: element.x + offsetAmount,
      y: element.y + offsetAmount,
    };
  } else if (element.type === "arrow") {
    newElement = {
      ...element,
      id: newId,
      startX: element.startX + offsetAmount,
      startY: element.startY + offsetAmount,
      endX: element.endX + offsetAmount,
      endY: element.endY + offsetAmount,
    };
  } else {
    // Fallback
    newElement = { ...(element as WhiteboardElement), id: newId };
  }

  return { kind: "element", value: newElement };
}

export function offsetSelections(selections: SelectionSet, offsetAmount: number = 20): SelectionSet {
  return selections.map(selection => offsetSelection(selection, offsetAmount));
}
