import type { WhiteboardElement } from "@/types/canvas";
import { getTextMetrics } from "@/canvas/renderer/text";
import { escAttr, escText, f } from "./utils";
export function textToSvg(
  el: Extract<WhiteboardElement, { type: "text" }>,
  ox: number,
  oy: number,
  measureContext: CanvasRenderingContext2D | null,
): string {
  const lines = el.text.split("\n");
  const lh = el.fontSize * (el.lineHeight ?? 1.2);
  const fontStyle = el.fontStyle === "italic" ? "italic" : "normal";
  const fontWeight = el.fontWeight === "bold" ? "bold" : "normal";
  const textDecor = el.textDecoration === "underline" ? ` text-decoration="underline"` : "";
  const align = el.textAlign || "left";
  const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";

  // Calculate text width to properly offset anchorX matching Canvas textAlign
  let measuredWidth = 0;
  if (measureContext) {
    measuredWidth = getTextMetrics(measureContext, el).width;
  } else {
    measuredWidth = el.fontSize * 0.6 * Math.max(...lines.map((l) => l.length), 1);
  }

  let anchorX = el.x + ox;
  if (align === "center") {
    anchorX = el.x + measuredWidth / 2 + ox;
  } else if (align === "right") {
    anchorX = el.x + measuredWidth + ox;
  }

  const baseY = el.y + oy; // matches canvas alphabetic baseline

  // Rotation pivot: matches canvas/text.ts (cx = el.x, cy = el.y - fontSize/2)
  const rot = el.rotation
    ? ` transform="rotate(${f(el.rotation * (180 / Math.PI))},${f(el.x + ox)},${f(el.y + oy - el.fontSize / 2)})"`
    : "";

  const fontFamily = escAttr(el.fontFamily ?? "Arial, sans-serif");

  const commonAttrs =
    `font-size="${el.fontSize}" font-family="${fontFamily}" ` +
    `font-weight="${fontWeight}" font-style="${fontStyle}"${textDecor} ` +
    `text-anchor="${anchor}" fill="${escAttr(el.strokeColor)}"`;

  if (lines.length === 1) {
    return `<text x="${f(anchorX)}" y="${f(baseY)}" ${commonAttrs}${rot}>${escText(lines[0]!)}</text>`;
  }

  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${f(anchorX)}" dy="${i === 0 ? "0" : f(lh)}">${escText(line || "\u00A0")}</tspan>`,
    )
    .join("");

  return `<text x="${f(anchorX)}" y="${f(baseY)}" ${commonAttrs}${rot}>${tspans}</text>`;
}
