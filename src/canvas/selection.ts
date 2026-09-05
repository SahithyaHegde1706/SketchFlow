import type { Bounds, Point, ResizeHandle, Selection, SelectionSet, WhiteboardElement } from "@/types/canvas";
import { getBounds, getStrokeBounds } from "./geometry";

function getElementBounds(context: CanvasRenderingContext2D, element: WhiteboardElement): Bounds {
  switch (element.type) {
    case "rectangle":
    case "circle":
      return {
        left: element.x,
        top: element.y,
        right: element.x + element.width,
        bottom: element.y + element.height,
      };
    case "arrow": {
      const angle = Math.atan2(element.endY - element.startY, element.endX - element.startX);
      const arrowheadLength = 12;
      const arrowheadAngle = Math.PI / 7;
      return getBounds([
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
    }
    case "text": {
      context.font = `${element.fontSize}px Arial, sans-serif`;
      const width = context.measureText(element.text).width;
      return {
        left: element.x,
        top: element.y - element.fontSize,
        right: element.x + width,
        bottom: element.y,
      };
    }
  }
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
) {
  const padding = 6;

  context.save();
  context.strokeStyle = "#0d9488";
  context.lineWidth = 2;
  context.setLineDash([5, 4]);

  const left = bounds.left - padding;
  const top = bounds.top - padding;
  const width = bounds.right - bounds.left + padding * 2;
  const height = bounds.bottom - bounds.top + padding * 2;

  context.beginPath();
  context.rect(left, top, width, height);
  context.stroke();

  if (!drawHandles) {
    context.restore();
    return;
  }

  context.setLineDash([]);
  context.fillStyle = "#e5e7eb";
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
    drawSelectionBounds(context, getSelectionBounds(context, selections[0]!, elements), selections[0]!.kind !== "group");
    return;
  }

  for (const item of selections) {
    drawSelectionBounds(context, getSelectionBounds(context, item, elements), false);
  }
  drawSelectionBounds(context, getCombinedSelectionBounds(context, selections, elements), false);
}

export function findResizeHandleAtPoint(
  context: CanvasRenderingContext2D,
  point: Point,
  selection: Selection,
  elements: WhiteboardElement[] = [],
): ResizeHandle | null {
  if (selection.kind === "group") return null;
  const bounds = getSelectionBounds(context, selection, elements);
  const padding = 6;
  const handleHitSize = 16;
  const left = bounds.left - padding;
  const right = bounds.right + padding;
  const top = bounds.top - padding;
  const bottom = bounds.bottom + padding;

  const handles: { type: ResizeHandle; x: number; y: number }[] = [
    { type: "top-left", x: left, y: top },
    { type: "top-right", x: right, y: top },
    { type: "bottom-left", x: left, y: bottom },
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
