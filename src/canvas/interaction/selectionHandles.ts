import type { Point, ResizeHandle } from "@/types/geometry";
import type { SelectionSet } from "@/types/editor";
import type { WhiteboardElement } from "@/types/canvas";
import { getCombinedSelectionBounds, getSelectionBounds } from "./selectionBounds";
import { getRotatedSelectionFrame } from "./selectionBounds";

export function findResizeHandleAtPoint(
  context: CanvasRenderingContext2D,
  point: Point,
  selection: SelectionSet,
  elements: WhiteboardElement[] = [],
): ResizeHandle | null {
  const padding = 6;
  const handleHitSize = 16;

  if (selection.length === 1 && selection[0]!.kind === "element" && selection[0]!.value.rotation) {
    const element = selection[0]!.value;
    const frame = getRotatedSelectionFrame(context, element, padding);
    if (Math.hypot(point.x - frame.rotationHandle.x, point.y - frame.rotationHandle.y) <= handleHitSize) {
      return "rotate";
    }
    const handleTypes: ResizeHandle[] = ["top-left", "top-right", "bottom-right", "bottom-left"];
    for (let index = 0; index < frame.corners.length; index += 1) {
      const corner = frame.corners[index]!;
      if (Math.abs(point.x - corner.x) <= handleHitSize / 2 && Math.abs(point.y - corner.y) <= handleHitSize / 2) {
        return handleTypes[index]!;
      }
    }
    return null;
  }

  const combinedBounds = getCombinedSelectionBounds(context, selection, elements);
  const top = combinedBounds.top - padding;
  const left = combinedBounds.left - padding;
  const width = combinedBounds.right - combinedBounds.left + padding * 2;
  const centerX = left + width / 2;
  const rotateHandleY = top - 24;

  if (
    point.x >= centerX - handleHitSize &&
    point.x <= centerX + handleHitSize &&
    point.y >= rotateHandleY - handleHitSize &&
    point.y <= rotateHandleY + handleHitSize
  ) {
    return "rotate";
  }

  if (selection.length !== 1 || selection[0]!.kind === "group") return null;

  const bounds = getSelectionBounds(context, selection[0]!, elements);
  const right = bounds.right + padding;
  const bottom = bounds.bottom + padding;
  const singleTop = bounds.top - padding;
  const singleLeft = bounds.left - padding;

  const handles: { type: ResizeHandle; x: number; y: number }[] = [
    { type: "top-left", x: singleLeft, y: singleTop },
    { type: "top-right", x: right, y: singleTop },
    { type: "bottom-left", x: singleLeft, y: bottom },
    { type: "bottom-right", x: right, y: bottom },
  ];

  for (const handle of handles) {
    if (
      point.x >= handle.x - handleHitSize / 2 &&
      point.x <= handle.x + handleHitSize / 2 &&
      point.y >= handle.y - handleHitSize / 2 &&
      point.y <= handle.y + handleHitSize / 2
    ) {
      return handle.type;
    }
  }

  return null;
}
