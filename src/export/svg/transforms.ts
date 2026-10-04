import type { WhiteboardElement } from "@/types/canvas";
import { f } from "./utils";

export function rotateAttr(el: WhiteboardElement, ox: number, oy: number): string {
  if (!el.rotation) return "";
  const deg = el.rotation * (180 / Math.PI);
  let pivotX: number;
  let pivotY: number;
  if (el.type === "arrow" || el.type === "line") {
    pivotX = (el.startX + el.endX) / 2 + ox;
    pivotY = (el.startY + el.endY) / 2 + oy;
  } else if (el.type === "text") {
    // Text rotation is handled with its own pivot in textToSvg
    return "";
  } else {
    pivotX = el.x + el.width / 2 + ox;
    pivotY = el.y + el.height / 2 + oy;
  }
  return ` transform="rotate(${f(deg)},${f(pivotX)},${f(pivotY)})"`;
}