import type { FreehandStroke } from "@/types/canvas";
import type { Point } from "@/types/geometry";

export const FREEHAND_MIN_DISTANCE = 3;

export function shouldSamplePoint(last: Point, next: Point): boolean {
  const dx = next.x - last.x;
  const dy = next.y - last.y;
  // Using squared comparison avoids a Math.sqrt call on every pointer event.
  return dx * dx + dy * dy >= FREEHAND_MIN_DISTANCE * FREEHAND_MIN_DISTANCE;
}

export function drawFreehandStroke(
  ctx: CanvasRenderingContext2D,
  stroke: FreehandStroke,
  color: string,
  width: number,
): void {
  if (stroke.length === 0) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // --- Single-click dot ---
  if (stroke.length === 1) {
    const p = stroke[0]!;
    // Radius: half the stroke width, but at least 1.5 logical units so it's
    // always visible even at tiny stroke widths.
    const radius = Math.max(width / 2, 1.5);
    ctx.beginPath();
    ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // --- Two-point short stroke: straight line ---
  if (stroke.length === 2) {
    const p0 = stroke[0]!;
    const p1 = stroke[1]!;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const first = stroke[0]!;
  const second = stroke[1]!;

  ctx.beginPath();
  ctx.moveTo((first.x + second.x) / 2, (first.y + second.y) / 2);

  for (let i = 1; i < stroke.length - 1; i++) {
    const current = stroke[i]!;
    const next = stroke[i + 1]!;
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    ctx.quadraticCurveTo(current.x, current.y, midX, midY);
  }

  // Final segment: from the last midpoint to the actual last point.
  const last = stroke[stroke.length - 1]!;
  ctx.lineTo(last.x, last.y);

  ctx.stroke();
  ctx.restore();
}
