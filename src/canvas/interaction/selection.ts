import type { Bounds, Point, ResizeHandle, Selection, SelectionSet, WhiteboardElement } from "@/types/canvas";
import { getBounds, getStrokeBounds, rotatePoint } from "../geometry/geometry";
import { getElementCenter } from "@/editor/rotation";
import { getTextBounds } from "../renderer/text";
import { isItemLocked, isAnySelectionLocked } from "@/editor/locking";

function getUnrotatedElementBounds(context: CanvasRenderingContext2D, element: WhiteboardElement): Bounds {
  let unrotatedBounds: Bounds;
  switch (element.type) {
    case "rectangle":
    case "roundedRectangle":
    case "circle":
    case "image":
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

  return unrotatedBounds;
}

function getElementBounds(context: CanvasRenderingContext2D, element: WhiteboardElement): Bounds {
  const bounds = getUnrotatedElementBounds(context, element);
  if (!element.rotation) return bounds;
  const center = getElementCenter(element);
  return getBounds([
    { x: bounds.left, y: bounds.top },
    { x: bounds.right, y: bounds.top },
    { x: bounds.right, y: bounds.bottom },
    { x: bounds.left, y: bounds.bottom },
  ].map(corner => rotatePoint(corner, center, element.rotation!)));
}

export function getRotatedSelectionFrame(context: CanvasRenderingContext2D, element: WhiteboardElement, padding = 6) {
  const bounds = getUnrotatedElementBounds(context, element);
  const padded = {
    left: bounds.left - padding,
    top: bounds.top - padding,
    right: bounds.right + padding,
    bottom: bounds.bottom + padding,
  };
  const center = getElementCenter(element);
  const rotate = (point: Point) => rotatePoint(point, center, element.rotation ?? 0);
  const corners = [
    rotate({ x: padded.left, y: padded.top }),
    rotate({ x: padded.right, y: padded.top }),
    rotate({ x: padded.right, y: padded.bottom }),
    rotate({ x: padded.left, y: padded.bottom }),
  ] as const;
  const topMidpoint = rotate({ x: (padded.left + padded.right) / 2, y: padded.top });
  const outward = { x: topMidpoint.x - center.x, y: topMidpoint.y - center.y };
  const length = Math.hypot(outward.x, outward.y) || 1;
  const rotationHandle = {
    x: topMidpoint.x + (outward.x / length) * 24,
    y: topMidpoint.y + (outward.y / length) * 24,
  };
  return { corners, rotationHandle };
}

function drawRotatedSelectionBounds(context: CanvasRenderingContext2D, element: WhiteboardElement, isLocked: boolean) {
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
