/**
 * SVG export — Step 35
 *
 * Generates a standalone, editable, pure vector SVG document from the whiteboard state
 * and triggers a browser file download.
 *
 * Rules:
 * - Vector primitives only (<rect>, <ellipse>, <line>, <path>, <text>); never embeds raster screenshots.
 * - Background rect always rendered.
 * - Grid, guides, selection, handles, overlays — never included.
 * - Freehand converted to SVG <path> using midpoint quadratic Bézier smoothing matching freehand.ts.
 * - Arrows rendered with vector path matching Canvas drawArrow.
 * - Rounded rectangles use <rect rx ry>.
 * - Ellipses use <ellipse>.
 * - Text rendered as vector <text>/<tspan>; formatting, alignment, and rotation preserved.
 * - Canonical layer order reproduced from creationOrder array.
 */

import type { CreationRecord, FreehandStroke, WhiteboardElement } from "@/types/canvas";
import { STROKE_COLOR, STROKE_WIDTH } from "@/canvas/renderer/renderer";
import { getTextMetrics } from "@/canvas/renderer/text";
import { computeExportBounds } from "@/export/bounds";

let cachedMeasureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!cachedMeasureContext) {
    const canvas = document.createElement("canvas");
    cachedMeasureContext = canvas.getContext("2d");
  }
  return cachedMeasureContext;
}

/**
 * Export the whiteboard as an SVG file and trigger a browser download.
 *
 * @param strokes           All freehand strokes.
 * @param elements          All whiteboard elements.
 * @param backgroundColor   Background fill colour (e.g. "#f8fafc").
 * @param creationOrder     Canonical interleaved layer-order array from creationOrderRef.
 */
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

// ---------------------------------------------------------------------------
// Freehand -> SVG
// ---------------------------------------------------------------------------

function freehandToSvg(stroke: FreehandStroke, ox: number, oy: number): string | null {
  if (stroke.length === 0) return null;

  const strokeColor =
    (stroke as unknown as { strokeColor?: string; color?: string }).strokeColor ??
    (stroke as unknown as { color?: string }).color ??
    STROKE_COLOR;
  const strokeWidth =
    (stroke as unknown as { strokeWidth?: number; width?: number }).strokeWidth ??
    (stroke as unknown as { width?: number }).width ??
    STROKE_WIDTH;

  // Single-point dot
  if (stroke.length === 1) {
    const p = stroke[0]!;
    const radius = Math.max(strokeWidth / 2, 1.5);
    return `<circle cx="${f(p.x + ox)}" cy="${f(p.y + oy)}" r="${f(radius)}" fill="${escAttr(strokeColor)}" />`;
  }

  // Two-point line
  if (stroke.length === 2) {
    const p0 = stroke[0]!;
    const p1 = stroke[1]!;
    return (
      `<path d="M ${f(p0.x + ox)} ${f(p0.y + oy)} L ${f(p1.x + ox)} ${f(p1.y + oy)}" ` +
      `stroke="${escAttr(strokeColor)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
    );
  }

  // 3+ points: midpoint quadratic Bézier spline (mirrors src/canvas/renderer/freehand.ts)
  const first = stroke[0]!;
  const second = stroke[1]!;
  const dParts: string[] = [];

  dParts.push(`M ${f((first.x + second.x) / 2 + ox)} ${f((first.y + second.y) / 2 + oy)}`);

  for (let i = 1; i < stroke.length - 1; i++) {
    const cur = stroke[i]!;
    const next = stroke[i + 1]!;
    const midX = (cur.x + next.x) / 2;
    const midY = (cur.y + next.y) / 2;
    dParts.push(`Q ${f(cur.x + ox)} ${f(cur.y + oy)} ${f(midX + ox)} ${f(midY + oy)}`);
  }

  const last = stroke[stroke.length - 1]!;
  dParts.push(`L ${f(last.x + ox)} ${f(last.y + oy)}`);

  return (
    `<path d="${dParts.join(" ")}" ` +
    `stroke="${escAttr(strokeColor)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none" />`
  );
}

// ---------------------------------------------------------------------------
// WhiteboardElement -> SVG
// ---------------------------------------------------------------------------

function elementToSvg(
  el: WhiteboardElement,
  ox: number,
  oy: number,
  measureContext: CanvasRenderingContext2D | null,
): string {
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

  if (el.type === "text") {
    return textToSvg(el, ox, oy, measureContext);
  }

  if (el.type === "image") {
    // If it has flips, we must wrap it in a group with the flip transform
    const rotStr = rot ? ` ${rot}` : "";
    const opacityAttr = el.opacity !== undefined ? ` opacity="${el.opacity}"` : "";
    const hasBorder = el.strokeWidth && el.strokeWidth > 0 && el.strokeColor;
    const radius = el.cornerRadius ?? 0;
    const hasRadius = radius > 0;
    const radiusAttr = hasRadius ? ` rx="${f(radius)}" ry="${f(radius)}"` : "";
    const hasShadow = el.shadowColor !== undefined;
    
    if (el.flipX || el.flipY) {
      const cx = el.x + el.width / 2 + ox;
      const cy = el.y + el.height / 2 + oy;
      const sx = el.flipX ? -1 : 1;
      const sy = el.flipY ? -1 : 1;
      // We translate to center, scale, translate back
      const flipTransform = `transform="translate(${cx}, ${cy}) scale(${sx}, ${sy}) translate(${-cx}, ${-cy})"`;
      
      let content = "";
      const clipId = `clip-${crypto.randomUUID()}`;
      const filterId = hasShadow ? `filter-${crypto.randomUUID()}` : "";
      
      if (hasShadow) {
        const shadowBlur = el.shadowBlur ?? 10;
        const shadowOffsetX = el.shadowOffsetX ?? 5;
        const shadowOffsetY = el.shadowOffsetY ?? 5;
        content += `<defs><filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${f(shadowOffsetX)}" dy="${f(shadowOffsetY)}" stdDeviation="${f(shadowBlur)}" flood-color="${escAttr(el.shadowColor!)}" /></filter></defs>`;
      }
      
      if (hasRadius) {
        content += `<defs><clipPath id="${clipId}"><rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" rx="${f(radius)}" ry="${f(radius)}" /></clipPath></defs>`;
      }
      
      const clipAttr = hasRadius ? ` clip-path="url(#${clipId})"` : "";
      const filterAttr = hasShadow ? ` filter="url(#${filterId})"` : "";
      content += `<image x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" href="${el.src}"${clipAttr}${filterAttr} />`;
      
      if (hasBorder) {
        content += `<rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" fill="none" stroke="${escAttr(el.strokeColor!)}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${radiusAttr} />`;
      }
      
      return (
        `<g ${flipTransform}${rotStr}${opacityAttr}>` +
        content +
        `</g>`
      );
    } else {
      let content = "";
      const clipId = `clip-${crypto.randomUUID()}`;
      const filterId = hasShadow ? `filter-${crypto.randomUUID()}` : "";
      
      if (hasShadow) {
        const shadowBlur = el.shadowBlur ?? 10;
        const shadowOffsetX = el.shadowOffsetX ?? 5;
        const shadowOffsetY = el.shadowOffsetY ?? 5;
        content += `<defs><filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${f(shadowOffsetX)}" dy="${f(shadowOffsetY)}" stdDeviation="${f(shadowBlur)}" flood-color="${escAttr(el.shadowColor!)}" /></filter></defs>`;
      }
      
      if (hasRadius) {
        content += `<defs><clipPath id="${clipId}"><rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" rx="${f(radius)}" ry="${f(radius)}" /></clipPath></defs>`;
      }
      
      const clipAttr = hasRadius ? ` clip-path="url(#${clipId})"` : "";
      const filterAttr = hasShadow ? ` filter="url(#${filterId})"` : "";
      content += `<image x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" href="${el.src}"${rot}${opacityAttr}${clipAttr}${filterAttr} />`;
      
      if (hasBorder) {
        content += `<rect x="${f(el.x + ox)}" y="${f(el.y + oy)}" width="${f(el.width)}" height="${f(el.height)}" fill="none" stroke="${escAttr(el.strokeColor!)}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${rot}${radiusAttr} />`;
      }
      
      return content;
    }
  }

  return "";
}

function textToSvg(
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

// ---------------------------------------------------------------------------
// SVG rotation transform
// ---------------------------------------------------------------------------

function rotateAttr(el: WhiteboardElement, ox: number, oy: number): string {
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

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function f(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function svgFill(color: string | null | undefined): string {
  if (!color || color === "transparent" || color === "none") return "none";
  return escAttr(color);
}

function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

