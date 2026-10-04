import type { WhiteboardElement } from "@/types/canvas";
import type { ShapeElement } from "./shapes";
import { shapeToSvg } from "./shapes";
import { imageToSvg } from "./image";
import { textToSvg } from "./text";

export { freehandToSvg } from "./freehand";
export { textToSvg } from "./text";

export function elementToSvg(
  el: WhiteboardElement,
  ox: number,
  oy: number,
  measureContext: CanvasRenderingContext2D | null,
): string {
  if (
    el.type === "rectangle" ||
    el.type === "roundedRectangle" ||
    el.type === "circle" ||
    el.type === "line" ||
    el.type === "arrow"
  ) {
    return shapeToSvg(el as ShapeElement, ox, oy);
  }

  if (el.type === "image") {
    return imageToSvg(el, ox, oy);
  }

  if (el.type === "text") {
    return textToSvg(el, ox, oy, measureContext);
  }

  return "";
}
