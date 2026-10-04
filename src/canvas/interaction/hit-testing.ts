import type { ArrowElement, CircleElement, CreationRecord, FreehandStroke, RectangleElement, RoundedRectangleElement, TextElement, WhiteboardElement } from "@/types/canvas";
import type { Point } from "@/types/geometry";
import type { Selection } from "@/types/editor";
import { distanceBetweenPoints, distanceToSegment, rotatePoint } from "../geometry/geometry";
import { getSelectionBounds } from "./selection";
import { getElementCenter } from "@/editor/rotation";
import { getTextBounds } from "@/canvas/renderer/text";

export const ERASER_TOLERANCE = 8;

export function findSelectionAtPoint(
  context: CanvasRenderingContext2D,
  point: Point,
  creationOrder: CreationRecord[],
  useBounds = false,
): Selection | null {
  for (let index = creationOrder.length - 1; index >= 0; index -= 1) {
    const record = creationOrder[index];

    if (!record) {
      continue;
    }

    let isHit = false;
    if (useBounds) {
      if (record.kind === "element" && record.value.type === "text") {
        isHit = isPointOnElement(context, point, record.value);
      } else {
        const bounds = getSelectionBounds(context, record);
        const hitPadding = 4;
        isHit =
          point.x >= bounds.left - hitPadding &&
          point.x <= bounds.right + hitPadding &&
          point.y >= bounds.top - hitPadding &&
          point.y <= bounds.bottom + hitPadding;
      }
    } else {
      isHit = Boolean(
        record.kind === "stroke"
          ? isPointOnStroke(point, record.value)
          : isPointOnElement(context, point, record.value)
      );
    }

    if (isHit) {
      return record;
    }
  }

  return null;
}

export function isPointOnElement(
  context: CanvasRenderingContext2D,
  point: Point,
  element: WhiteboardElement,
) {
  let hitPoint = point;
  if (element.rotation) {
    hitPoint = rotatePoint(point, getElementCenter(element), -element.rotation);
  }

  switch (element.type) {
    case "rectangle":
      return isPointNearRectangle(hitPoint, element);
    case "roundedRectangle":
      return isPointNearRoundedRectangle(hitPoint, element);
    case "circle":
      return isPointNearEllipse(hitPoint, element);
    case "arrow":
      return isPointNearArrow(hitPoint, element);
    case "line":
      return isPointNearLine(hitPoint, element);
    case "text":
      return isPointInTextBounds(context, hitPoint, element);
    case "image":
      return isPointNearImage(hitPoint, element);
  }
}

export function isPointNearImage(point: Point, image: { x: number; y: number; width: number; height: number; }) {
  const left = image.x;
  const right = image.x + image.width;
  const top = image.y;
  const bottom = image.y + image.height;
  
  return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
}

export function isPointOnStroke(point: Point, stroke: FreehandStroke) {
  if (stroke.length === 1) {
    return distanceBetweenPoints(point, stroke[0] ?? point) <= ERASER_TOLERANCE;
  }

  for (let index = 1; index < stroke.length; index += 1) {
    const start = stroke[index - 1];
    const end = stroke[index];

    if (start && end && distanceToSegment(point, start, end) <= ERASER_TOLERANCE) {
      return true;
    }
  }

  return false;
}

export function isPointNearRectangle(point: Point, rectangle: RectangleElement) {
  const left = rectangle.x;
  const right = rectangle.x + rectangle.width;
  const top = rectangle.y;
  const bottom = rectangle.y + rectangle.height;
  
  if (rectangle.fillColor && rectangle.fillColor !== "transparent" && rectangle.fillColor !== "none") {
    if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
      return true;
    }
  }

  const edges = [
    [
      { x: left, y: top },
      { x: right, y: top },
    ],
    [
      { x: right, y: top },
      { x: right, y: bottom },
    ],
    [
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
    [
      { x: left, y: bottom },
      { x: left, y: top },
    ],
  ] as const;

  return edges.some(([start, end]) => distanceToSegment(point, start, end) <= ERASER_TOLERANCE);
}

export function isPointNearEllipse(point: Point, circle: CircleElement) {
  const radiusX = circle.width / 2;
  const radiusY = circle.height / 2;

  if (radiusX === 0 || radiusY === 0) {
    return false;
  }

  const normalizedDistance = Math.hypot(
    (point.x - (circle.x + radiusX)) / radiusX,
    (point.y - (circle.y + radiusY)) / radiusY,
  );

  if (circle.fillColor && circle.fillColor !== "transparent" && circle.fillColor !== "none") {
    if (normalizedDistance <= 1) {
      return true;
    }
  }

  return Math.abs(normalizedDistance - 1) * Math.min(radiusX, radiusY) <= ERASER_TOLERANCE;
}

export function isPointNearArrow(point: Point, arrow: ArrowElement) {
  const angle = Math.atan2(arrow.endY - arrow.startY, arrow.endX - arrow.startX);
  const arrowheadLength = 12;
  const arrowheadAngle = Math.PI / 7;
  const leftHead = {
    x: arrow.endX - arrowheadLength * Math.cos(angle - arrowheadAngle),
    y: arrow.endY - arrowheadLength * Math.sin(angle - arrowheadAngle),
  };
  const rightHead = {
    x: arrow.endX - arrowheadLength * Math.cos(angle + arrowheadAngle),
    y: arrow.endY - arrowheadLength * Math.sin(angle + arrowheadAngle),
  };

  return [
    [
      { x: arrow.startX, y: arrow.startY },
      { x: arrow.endX, y: arrow.endY },
    ],
    [leftHead, { x: arrow.endX, y: arrow.endY }],
    [{ x: arrow.endX, y: arrow.endY }, rightHead],
  ].some(([start, end]) => distanceToSegment(point, start, end) <= ERASER_TOLERANCE);
}

export function isPointInTextBounds(
  context: CanvasRenderingContext2D,
  point: Point,
  text: TextElement,
) {
  const bounds = getTextBounds(context, text);
  const padding = Math.max(ERASER_TOLERANCE, text.fontSize * 0.2);

  return (
    point.x >= bounds.left - padding &&
    point.x <= bounds.right + padding &&
    point.y >= bounds.top - padding &&
    point.y <= bounds.bottom + padding
  );
}

export function isPointNearLine(point: Point, line: { startX: number; startY: number; endX: number; endY: number }) {
  return distanceToSegment(
    point,
    { x: line.startX, y: line.startY },
    { x: line.endX, y: line.endY },
  ) <= ERASER_TOLERANCE;
}

export function isPointNearRoundedRectangle(point: Point, rectangle: RoundedRectangleElement) {
  const left = rectangle.x;
  const right = rectangle.x + rectangle.width;
  const top = rectangle.y;
  const bottom = rectangle.y + rectangle.height;
  
  if (rectangle.fillColor && rectangle.fillColor !== "transparent" && rectangle.fillColor !== "none") {
    if (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) {
      return true;
    }
  }

  const edges = [
    [
      { x: left, y: top },
      { x: right, y: top },
    ],
    [
      { x: right, y: top },
      { x: right, y: bottom },
    ],
    [
      { x: right, y: bottom },
      { x: left, y: bottom },
    ],
    [
      { x: left, y: bottom },
      { x: left, y: top },
    ],
  ] as const;

  return edges.some(([start, end]) => distanceToSegment(point, start, end) <= ERASER_TOLERANCE);
}
