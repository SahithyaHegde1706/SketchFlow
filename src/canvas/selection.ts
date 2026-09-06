import type { Bounds, Point, ResizeHandle, Selection, SelectionSet, WhiteboardElement } from "@/types/canvas";
import { getBounds, getStrokeBounds, rotatePoint } from "./geometry";
import { getElementCenter } from "@/editor/rotation";
import { getTextBounds } from "./text";
import { isItemLocked, isAnySelectionLocked } from "@/editor/locking";

function getElementBounds(context: CanvasRenderingContext2D, element: WhiteboardElement): Bounds {
  let unrotatedBounds: Bounds;
  
  switch (element.type) {
    case "rectangle":
    case "roundedRectangle":
    case "circle":
      unrotatedBounds = {
        left: element.x,
        top: element.y,
        right: element.x + element.width,
        bottom: element.y + element.height,
      };
      break;
    case "line":
      unrotatedBounds = getBounds([
        { x: element.startX, y: element.startY },
        { x: element.endX, y: element.endY },
      ]);
      break;
    case "arrow": {
      const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
      const arrowheadLength = 12;
      const arrowheadAngle = Math.PI / 7;
      unrotatedBounds = getBounds([
        { x: element.startX, y: element.startY },
        { x: element.endX, y: element.endY },
        {
          x: element.endX - arrowheadLength * Math.cos(angle - arrowheadAngle),
          y: element.endY - arrowheadLength * Math.sin(angle - arrowheadAngle),
        },
        {
          x: element.endX - arrowheadLength * Math.cos(angle + arrowheadAngle),
          y: element.endY - arrowheadLength * Math.sin(angle + arrowheadAngle),
        },
      ]);
      break;
    }
    case "text": {
      unrotatedBounds = getTextBounds(context, element);
      break;
    }
  }

  if (element.rotation) {
    const center = getElementCenter(element);
    const corners = [
      { x: unrotatedBounds.left, y: unrotatedBounds.top },
      { x: unrotatedBounds.right, y: unrotatedBounds.top },
      { x: unrotatedBounds.right, y: unrotatedBounds.bottom },
      { x: unrotatedBounds.left, y: unrotatedBounds.bottom },
    ];
    const rotatedCorners = corners.map(corner => rotatePoint(corner, center, element.rotation!));
    return getBounds(rotatedCorners);
  }

  return unrotatedBounds;
}

export function getSelectionBounds(
  context: CanvasRenderingContext2D,
  selection: Selection,
  elements: WhiteboardElement[] = [],
): Bounds {
  if (selection.kind === "stroke") {
    return getStrokeBounds(selection.value);
  }

  if (selection.kind === "group") {
    return elements
      .filter(element => selection.value.elementIds.includes(element.id))
      .map(element => getElementBounds(context, element))
      .reduce((bounds, elementBounds) => ({
        left: Math.min(bounds.left, elementBounds.left),
        top: Math.min(bounds.top, elementBounds.top),
        right: Math.max(bounds.right, elementBounds.right),
        bottom: Math.max(bounds.bottom, elementBounds.bottom),
      }), { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
  }

  return getElementBounds(context, selection.value);
}

export function getCombinedSelectionBounds(
  context: CanvasRenderingContext2D,
  selections: SelectionSet,
  elements: WhiteboardElement[] = [],
): Bounds {
  return selections.reduce(
    (bounds, selection) => {
      const selectionBounds = getSelectionBounds(context, selection, elements);
      return {
        left: Math.min(bounds.left, selectionBounds.left),
        top: Math.min(bounds.top, selectionBounds.top),
        right: Math.max(bounds.right, selectionBounds.right),
        bottom: Math.max(bounds.bottom, selectionBounds.bottom),
      };
    },
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  );
}

function drawSelectionBounds(
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

export function findResizeHandleAtPoint(
  context: CanvasRenderingContext2D,
  point: Point,
  selection: SelectionSet,
  elements: WhiteboardElement[] = [],
): ResizeHandle | null {
  const padding = 6;
  const handleHitSize = 16;
  
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
