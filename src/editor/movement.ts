import type { FreehandStroke, Selection, WhiteboardElement, Group } from "@/types/canvas";

export function moveSelection(
  selection: Selection,
  original: FreehandStroke | WhiteboardElement | Group,
  deltaX: number,
  deltaY: number,
  elements: WhiteboardElement[] = [],
) {
  if (selection.kind === "stroke" && Array.isArray(original)) {
    selection.value.splice(
      0,
      selection.value.length,
      ...original.map((point) => ({ x: point.x + deltaX, y: point.y + deltaY })),
    );
    return;
  }

  if (selection.kind === "group" && !Array.isArray(original) && "elementIds" in original) {
    for (const id of original.elementIds) {
      const element = elements.find((e) => e.id === id);
      if (element) {
        // since keyboard movement and dragging might behave differently,
        // we can just directly move the element's current position by delta
        // if original was provided, it's actually not useful for group elements unless we clone them all.
        // wait, for drag we need the original element!
      }
    }
  }

  if (selection.kind !== "element" || Array.isArray(original) || ("elementIds" in original)) {
    return;
  }

  if ((selection.value.type === "arrow" || selection.value.type === "line") && (original.type === "arrow" || original.type === "line")) {
    selection.value.startX = original.startX + deltaX;
    selection.value.startY = original.startY + deltaY;
    selection.value.endX = original.endX + deltaX;
    selection.value.endY = original.endY + deltaY;
  } else if (selection.value.type !== "arrow" && selection.value.type !== "line" && original.type !== "arrow" && original.type !== "line") {
    selection.value.x = original.x + deltaX;
    selection.value.y = original.y + deltaY;
  }
}
