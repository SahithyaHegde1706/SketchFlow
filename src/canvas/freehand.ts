import type { FreehandStroke, Point } from "@/types/canvas";

/**
 * Minimum logical-coordinate distance between two consecutive sampled points.
 *
 * Operating in logical (canvas) coordinates means the threshold is zoom-invariant:
 * a stroke drawn at 50% zoom uses the same minimum distance as one drawn at 200%.
 */
export const FREEHAND_MIN_DISTANCE = 3;

/**
 * Returns true when `next` is far enough from `last` to be worth storing.
 *
 * Call this in pointermove before pushing the new point. Very small pointer
 * jitter (sub-3-logical-unit movement) is silently discarded.
 */
export function shouldSamplePoint(last: Point, next: Point): boolean {
  const dx = next.x - last.x;
  const dy = next.y - last.y;
  // Using squared comparison avoids a Math.sqrt call on every pointer event.
  return dx * dx + dy * dy >= FREEHAND_MIN_DISTANCE * FREEHAND_MIN_DISTANCE;
}

/**
 * Draws a freehand stroke onto `ctx` using midpoint quadratic Bézier smoothing.
 *
 * Technique:
 *   – 1 point  → filled circle arc (single-click dot)
 *   – 2 points → straight line segment (already smooth enough)
 *   – 3+ points → midpoint quadratic Bézier spline
 *
 * The midpoint spline works by treating each stored point as a "control point"
 * and drawing the curve through the midpoints between consecutive pairs. This
 * avoids sharp kinks at every sample without requiring heavy curve fitting.
 *
 * Hit-testing continues to operate on the raw stored points (unchanged), so
 * selection and eraser remain consistent with what the user drew.
 */
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

  // --- Three or more points: midpoint quadratic Bézier spline ---
  //
  // For points p[0], p[1], …, p[N-1]:
  //   Start at the midpoint of p[0]–p[1] (so the curve begins smoothly).
  //   For each interior point p[i], draw a quadratic curve with control point
  //   p[i] and endpoint at mid(p[i], p[i+1]).
  //   Finish with a straight segment to p[N-1] so the tail meets the last
  //   actual pointer position precisely.
  //
  // This is a well-known lightweight smoothing technique compatible with the
  // native Canvas 2D API. No extra dependencies required.

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
