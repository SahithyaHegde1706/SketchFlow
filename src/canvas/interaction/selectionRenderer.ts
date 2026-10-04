import type { Bounds } from "@/types/geometry";
import type { Selection, SelectionSet } from "@/types/editor";
import type { WhiteboardElement } from "@/types/canvas";
import { isItemLocked, isAnySelectionLocked } from "@/editor/locking";
import { getSelectionBounds, getCombinedSelectionBounds } from "./selectionBounds";
import { getRotatedSelectionFrame } from "./selectionBounds";

export function drawRotatedSelectionBounds(context: CanvasRenderingContext2D, element: WhiteboardElement, isLocked: boolean) {
  const frame = getRotatedSelectionFrame(context, element);
  context.save();
  context.strokeStyle = isLocked ? "#ef4444" : "#0d9488";
  context.lineWidth = 2;
  context.setLineDash([5, 4]);
  context.beginPath();
  context.moveTo(frame.corners[0].x, frame.corners[0].y);
  for (let index = 1; index < frame.corners.length; index += 1) {
    context.lineTo(frame.corners[index].x, frame.corners[index].y);
  }
  context.closePath();
  context.stroke();
  context.setLineDash([]);

  if (!isLocked) {
    const topMidpoint = {
      x: (frame.corners[0].x + frame.corners[1].x) / 2,
      y: (frame.corners[0].y + frame.corners[1].y) / 2,
    };
    context.beginPath();
    context.moveTo(topMidpoint.x, topMidpoint.y);
    context.lineTo(frame.rotationHandle.x, frame.rotationHandle.y);
    context.stroke();
    context.beginPath();
    context.arc(frame.rotationHandle.x, frame.rotationHandle.y, 10 / 1.5, 0, Math.PI * 2);
    context.fillStyle = "#e5e7eb";
    context.fill();
    context.stroke();
    for (const corner of frame.corners) {
      context.beginPath();
      context.rect(corner.x - 5, corner.y - 5, 10, 10);
      context.fill();
      context.stroke();
    }
  }
  context.restore();
}

export function drawSelectionBounds(
  context: CanvasRenderingContext2D,
  bounds: Bounds,
  drawHandles: boolean,
  drawRotationHandle: boolean,
  isLocked: boolean = false,
) {
  const padding = 6;

  context.save();
  context.strokeStyle = isLocked ? "#ef4444" : "#0d9488";
  context.lineWidth = 2;
  context.setLineDash([5, 4]);

  const left = bounds.left - padding;
  const top = bounds.top - padding;
  const width = bounds.right - bounds.left + padding * 2;
  const height = bounds.bottom - bounds.top + padding * 2;

  context.beginPath();
  context.rect(left, top, width, height);
  context.stroke();

  context.setLineDash([]);
  context.fillStyle = "#e5e7eb";

  if (drawRotationHandle && !isLocked) {
    const handleSize = 10;
    const centerX = left + width / 2;
    const rotateHandleY = top - 24;

    context.beginPath();
    context.moveTo(centerX, top);
    context.lineTo(centerX, rotateHandleY);
    context.stroke();

    context.beginPath();
    context.arc(centerX, rotateHandleY, handleSize / 1.5, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  if (drawHandles && !isLocked) {
    const handleSize = 10;
    const right = left + width;
    const bottom = top + height;

    const handles = [
      { x: left, y: top },
      { x: right, y: top },
      { x: left, y: bottom },
      { x: right, y: bottom },
    ];

    for (const handle of handles) {
      context.beginPath();
      context.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      context.fill();
      context.stroke();
    }
  }

  if (isLocked) {
    const badgeX = left + width / 2;
    const badgeY = top - 14;
    context.save();
    context.fillStyle = "#ef4444";
    context.beginPath();
    context.arc(badgeX, badgeY, 10, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "#ffffff";
    context.fillRect(badgeX - 4, badgeY - 1, 8, 6);
    context.strokeStyle = "#ffffff";
    context.lineWidth = 1.5;
    context.beginPath();
    context.arc(badgeX, badgeY - 2, 3, Math.PI, 0);
    context.stroke();
    context.restore();
  }

  context.restore();
}

export function drawSelection(
  context: CanvasRenderingContext2D,
  selection: Selection | SelectionSet,
  elements: WhiteboardElement[] = [],
) {
  const selections = Array.isArray(selection) ? selection : [selection];
  if (selections.length === 0) {
    return;
  }

  if (selections.length === 1) {
    const locked = isItemLocked(selections[0]!, elements);
    if (selections[0]!.kind === "element" && selections[0]!.value.rotation) {
      drawRotatedSelectionBounds(context, selections[0]!.value, locked);
      return;
    }
    drawSelectionBounds(
      context,
      getSelectionBounds(context, selections[0]!, elements),
      selections[0]!.kind !== "group",
      true,
      locked,
    );
    return;
  }

  const anyLocked = isAnySelectionLocked(selections, elements);

  for (const item of selections) {
    const itemLocked = isItemLocked(item, elements);
    drawSelectionBounds(context, getSelectionBounds(context, item, elements), false, false, itemLocked);
  }
  drawSelectionBounds(
    context,
    getCombinedSelectionBounds(context, selections, elements),
    false,
    !anyLocked,
    anyLocked,
  );
}
