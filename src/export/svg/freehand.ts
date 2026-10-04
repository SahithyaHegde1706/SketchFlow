import type { FreehandStroke } from "@/types/canvas";
import { STROKE_COLOR, STROKE_WIDTH } from "@/canvas/renderer/styles";
import { escAttr, f } from "./utils";
export function freehandToSvg(stroke: FreehandStroke, ox: number, oy: number): string | null {
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
