import type { FreehandStroke, Selection, WhiteboardElement } from "@/types/canvas";

export function moveSelection(
  selection: Selection,
  original: FreehandStroke | WhiteboardElement,
  deltaX: number,
  deltaY: number,
) {
  if (selection.kind === "stroke" && Array.isArray(original)) {
    selection.value.splice(
      0,
      selection.value.length,
      ...original.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY })),
    );
    return;
  }

  if (selection.kind !== "element" || Array.isArray(original)) {
    return;
  }

  if (selection.value.type === "arrow" && original.type === "arrow") {
    selection.value.startX = original.startX + deltaX;
    selection.value.startY = original.startY + deltaY;
    selection.value.endX = original.endX + deltaX;
    selection.value.endY = original.endY + deltaY;
  } else if (selection.value.type !== "arrow" && original.type !== "arrow") {
    selection.value.x = original.x + deltaX;
    selection.value.y = original.y + deltaY;
  }
}
