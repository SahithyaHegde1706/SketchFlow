import type { CreationRecord, FreehandStroke, WhiteboardElement } from "@/types/canvas";
import { computeExportBounds } from "@/export/bounds";
import { elementToSvg, freehandToSvg } from "./svg/elements";
import { triggerDownload } from "./svg/download";
import { escAttr, f, getMeasureContext } from "./svg/utils";

export function exportToSvg(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  backgroundColor: string,
  creationOrder: CreationRecord[] = [],
): void {
  try {
    const measureCtx = getMeasureContext();
    const bounds = computeExportBounds(strokes, elements, measureCtx);
    const w = bounds.right - bounds.left;
    const h = bounds.bottom - bounds.top;
    // Offset that maps document coordinates -> SVG viewBox coordinates
    const ox = -bounds.left;
    const oy = -bounds.top;

    const parts: string[] = [];

    // SVG header with viewBox
    parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}" height="${f(h)}" viewBox="0 0 ${f(w)} ${f(h)}">`,
    );

    // Background rect — always included covering full bounds
    parts.push(
      `  <rect x="0" y="0" width="${f(w)}" height="${f(h)}" fill="${escAttr(backgroundColor)}" />`,
    );

    // Emit all content in canonical layer order
    if (creationOrder && creationOrder.length > 0) {
      for (const record of creationOrder) {
        if (record.kind === "stroke") {
          const path = freehandToSvg(record.value, ox, oy);
          if (path) parts.push(`  ${path}`);
        } else {
          const svg = elementToSvg(record.value, ox, oy, measureCtx);
          if (svg) parts.push(`  ${svg}`);
        }
      }
    } else {
      // Fallback: strokes then elements
      for (const stroke of strokes) {
        const path = freehandToSvg(stroke, ox, oy);
        if (path) parts.push(`  ${path}`);
      }
      for (const el of elements) {
        const svg = elementToSvg(el, ox, oy, measureCtx);
        if (svg) parts.push(`  ${svg}`);
      }
    }

    parts.push("</svg>");

    const svg = parts.join("\n");
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    triggerDownload(url, "sketchflow-board.svg");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (err) {
    console.error("[SketchFlow] SVG export failed:", err);
  }
}

