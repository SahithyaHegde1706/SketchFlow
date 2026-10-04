import type { Bounds, Point } from "@/types/geometry";
import type { Selection, SelectionSet } from "@/types/editor";
import type { WhiteboardElement } from "@/types/canvas";
import { getBounds, getStrokeBounds, rotatePoint } from "../geometry/geometry";
import { getElementCenter } from "@/editor/rotation";
import { getTextBounds } from "../renderer/text";

export function getUnrotatedElementBounds(context: CanvasRenderingContext2D, element: WhiteboardElement): Bounds {
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

export function getElementBounds(context: CanvasRenderingContext2D, element: WhiteboardElement): Bounds {
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
