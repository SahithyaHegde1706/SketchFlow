import type { ArrowElement, CircleElement, Group, Point, RectangleElement, Selection, FreehandStroke, WhiteboardElement } from "@/types/canvas";
import { STROKE_COLOR, STROKE_WIDTH } from "@/canvas/renderer";

export function createRectangle(start: Point, end: Point): RectangleElement {
  return {
    id: crypto.randomUUID(),
    type: "rectangle",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    strokeColor: STROKE_COLOR,
    strokeWidth: STROKE_WIDTH,
  };
}

export function createCircle(start: Point, end: Point): CircleElement {
  return {
    id: crypto.randomUUID(),
    type: "circle",
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
    strokeColor: STROKE_COLOR,
    strokeWidth: STROKE_WIDTH,
  };
}

export function createArrow(start: Point, end: Point): ArrowElement {
  return {
    id: crypto.randomUUID(),
    type: "arrow",
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    strokeColor: STROKE_COLOR,
    strokeWidth: STROKE_WIDTH,
  };
}

export function cloneSelectionValue(selection: Selection): FreehandStroke | WhiteboardElement | Group {
  if (selection.kind === "group") {
    return { ...selection.value, elementIds: [...selection.value.elementIds] };
  }

  return selection.kind === "stroke"
    ? selection.value.map((point) => ({ ...point }))
    : { ...selection.value };
}
