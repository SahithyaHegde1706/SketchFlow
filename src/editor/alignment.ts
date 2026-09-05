import type { AlignOperation, Bounds, FreehandStroke, Selection, SelectionSet, WhiteboardElement, Group } from "@/types/canvas";
import { getSelectionBounds, getCombinedSelectionBounds } from "@/canvas/selection";
import { moveSelection } from "@/editor/movement";

type AlignUnit = {
  selection: Selection;
  bounds: Bounds;
};

export function alignSelection(
  context: CanvasRenderingContext2D,
  selections: SelectionSet,
  originals: (FreehandStroke | WhiteboardElement | Group)[],
  operation: AlignOperation,
  elements: WhiteboardElement[]
): boolean {
  if (selections.length < 2) return false;

  const units: AlignUnit[] = selections.map(selection => ({
    selection,
    bounds: getSelectionBounds(context, selection, elements),
  }));

  const combinedBounds = getCombinedSelectionBounds(context, selections, elements);

  let moved = false;

  if (operation === "distribute-horizontal" || operation === "distribute-vertical") {
    if (units.length < 3) return false;

    const isHoriz = operation === "distribute-horizontal";
    
    // Sort units by their center
    units.sort((a, b) => {
      const centerA = isHoriz ? (a.bounds.left + a.bounds.right) / 2 : (a.bounds.top + a.bounds.bottom) / 2;
      const centerB = isHoriz ? (b.bounds.left + b.bounds.right) / 2 : (b.bounds.top + b.bounds.bottom) / 2;
      return centerA - centerB;
    });

    const first = units[0]!;
    const last = units[units.length - 1]!;
    
    // Distribute by centers
    const firstCenter = isHoriz ? (first.bounds.left + first.bounds.right) / 2 : (first.bounds.top + first.bounds.bottom) / 2;
    const lastCenter = isHoriz ? (last.bounds.left + last.bounds.right) / 2 : (last.bounds.top + last.bounds.bottom) / 2;
    const step = (lastCenter - firstCenter) / (units.length - 1);

    for (let i = 1; i < units.length - 1; i++) {
      const unit = units[i]!;
      const originalIndex = selections.indexOf(unit.selection);
      const original = originals[originalIndex]!;
      const currentCenter = isHoriz ? (unit.bounds.left + unit.bounds.right) / 2 : (unit.bounds.top + unit.bounds.bottom) / 2;
      const targetCenter = firstCenter + step * i;
      const delta = targetCenter - currentCenter;
      
      if (Math.abs(delta) > 0.1) {
        if (isHoriz) {
          moveSelection(unit.selection, original, delta, 0, elements);
        } else {
          moveSelection(unit.selection, original, 0, delta, elements);
        }
        moved = true;
      }
    }

    return moved;
  }

  // Alignment
  const targetX = operation === "align-left" ? combinedBounds.left
    : operation === "align-right" ? combinedBounds.right
    : (combinedBounds.left + combinedBounds.right) / 2;

  const targetY = operation === "align-top" ? combinedBounds.top
    : operation === "align-bottom" ? combinedBounds.bottom
    : (combinedBounds.top + combinedBounds.bottom) / 2;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i]!;
    const original = originals[i]!;
    
    let deltaX = 0;
    let deltaY = 0;

    switch (operation) {
      case "align-left":
        deltaX = targetX - unit.bounds.left;
        break;
      case "align-right":
        deltaX = targetX - unit.bounds.right;
        break;
      case "align-center":
        deltaX = targetX - ((unit.bounds.left + unit.bounds.right) / 2);
        break;
      case "align-top":
        deltaY = targetY - unit.bounds.top;
        break;
      case "align-bottom":
        deltaY = targetY - unit.bounds.bottom;
        break;
      case "align-middle":
        deltaY = targetY - ((unit.bounds.top + unit.bounds.bottom) / 2);
        break;
    }

    if (Math.abs(deltaX) > 0.1 || Math.abs(deltaY) > 0.1) {
      moveSelection(unit.selection, original, deltaX, deltaY, elements);
      moved = true;
    }
  }

  return moved;
}
