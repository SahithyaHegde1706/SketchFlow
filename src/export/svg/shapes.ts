import type { WhiteboardElement } from "@/types/canvas";
import { rotateAttr } from "./transforms";
import { escAttr, f, svgFill } from "./utils";

export type ShapeElement = Extract<
  WhiteboardElement,
  { type: "rectangle" | "roundedRectangle" | "circle" | "line" | "arrow" }
>;

export function shapeToSvg(el: ShapeElement, ox: number, oy: number): string {
  const rot = rotateAttr(el, ox, oy);
  if (el.type === "rectangle") {
    const fill = svgFill(el.fillColor);
    return (
      `<rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" ` +
      `width="${f(el.width)}" height="${f(el.height)}" ` +
      `stroke="${escAttr(el.strokeColor)}" stroke-width="${el.strokeWidth}" ` +
      `stroke-linecap="round" stroke-linejoin="round" fill="${fill}"${rot} />`
    );
  }

  if (el.type === "roundedRectangle") {
    const fill = svgFill(el.fillColor);
    return (
      `<rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" ` +
      `width="${f(el.width)}" height="${f(el.height)}" ` +
      `rx="${f(el.radius)}" ry="${f(el.radius)}" ` +
      `stroke="${escAttr(el.strokeColor)}" stroke-width="${el.strokeWidth}" ` +
      `stroke-linecap="round" stroke-linejoin="round" fill="${fill}"${rot} />`
    );
  }

  if (el.type === "circle") {
    const rx = el.width / 2;
    const ry = el.height / 2;
    const ecx = el.x + rx + ox;
    const ecy = el.y + ry + oy;
    const fill = svgFill(el.fillColor);
    return (
      `<ellipse cx="${f(ecx)}" cy="${f(ecy)}" rx="${f(rx)}" ry="${f(ry)}" ` +
      `stroke="${escAttr(el.strokeColor)}" stroke-width="${el.strokeWidth}" ` +
      `stroke-linecap="round" stroke-linejoin="round" fill="${fill}"${rot} />`
    );
  }

  if (el.type === "line") {
    return (
      `<line x1="${f(el.startX + ox)}" y1="${f(el.startY + oy)}" ` +
      `x2="${f(el.endX + ox)}" y2="${f(el.endY + oy)}" ` +
      `stroke="${escAttr(el.strokeColor)}" stroke-width="${el.strokeWidth}" ` +
      `stroke-linecap="round"${rot} />`
    );
  }

  if (el.type === "arrow") {
    // Render shaft and arrowhead wings matching Canvas drawArrow
    const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
    const arrowheadLength = 12;
    const arrowheadAngle = Math.PI / 7;

    const sx = el.startX + ox;
    const sy = el.startY + oy;
    const ex = el.endX + ox;
    const ey = el.endY + oy;

    const h1x = el.endX - arrowheadLength * Math.cos(angle - arrowheadAngle) + ox;
    const h1y = el.endY - arrowheadLength * Math.sin(angle - arrowheadAngle) + oy;
    const h2x = el.endX - arrowheadLength * Math.cos(angle + arrowheadAngle) + ox;
    const h2y = el.endY - arrowheadLength * Math.sin(angle + arrowheadAngle) + oy;

    const d = `M ${f(sx)} ${f(sy)} L ${f(ex)} ${f(ey)} M ${f(h1x)} ${f(h1y)} L ${f(ex)} ${f(ey)} L ${f(h2x)} ${f(h2y)}`;

    return (
      `<path d="${d}" ` +
      `stroke="${escAttr(el.strokeColor)}" stroke-width="${el.strokeWidth}" ` +
      `stroke-linecap="round" stroke-linejoin="round" fill="none"${rot} />`
    );
  }

  return "";
}
