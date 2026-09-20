/**
 * Export bounds calculation — Step 35
 *
 * Calculates the exact axis-aligned visual bounding box of all drawable
 * document content (strokes + elements) with 32 logical pixels of padding.
 *
 * Accounts for:
 * - stroke widths on all primitives
 * - rotated elements using actual rotated AABBs (corners rotated around pivot)
 * - text metrics and formatting via src/canvas/text.ts
 * - multiline text and rotated text
 * - arrowheads and line endpoints
 * - single-point freehand dots and multi-point smoothed freehand paths
 * - groups through their drawable member elements
 * - 1024x768 fallback for empty documents
 */

import type { Bounds, FreehandStroke, Point, WhiteboardElement } from "@/types/canvas";
import { getBounds, rotatePoint } from "@/canvas/geometry";
import { getElementCenter } from "@/editor/rotation";
import { getTextBounds } from "@/canvas/text";
import { STROKE_WIDTH } from "@/canvas/renderer";

/** Logical pixels of padding added around the content bounding box. */
export const EXPORT_PADDING = 32;

/** Fallback dimensions when the document contains no drawable objects. */
export const FALLBACK_BOUNDS: Bounds = {
  left: 0,
  top: 0,
  right: 1024,
  bottom: 768,
};

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
 * Compute the export bounding box covering all drawable content, expanded
 * by EXPORT_PADDING (32px) on all sides.
 */
export function computeExportBounds(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  measureContext?: CanvasRenderingContext2D | null,
): Bounds {
  const ctx = measureContext ?? getMeasureContext();
  const allBounds: Bounds[] = [];

  for (const stroke of strokes) {
    const b = strokeBounds(stroke);
    if (b) allBounds.push(b);
  }

  for (const el of elements) {
    const b = elementVisualBounds(el, ctx);
    if (b) allBounds.push(b);
  }

  if (allBounds.length === 0) {
    return { ...FALLBACK_BOUNDS };
  }

  const left = Math.min(...allBounds.map((b) => b.left)) - EXPORT_PADDING;
  const top = Math.min(...allBounds.map((b) => b.top)) - EXPORT_PADDING;
  const right = Math.max(...allBounds.map((b) => b.right)) + EXPORT_PADDING;
  const bottom = Math.max(...allBounds.map((b) => b.bottom)) + EXPORT_PADDING;

  return { left, top, right, bottom };
}

/**
 * Calculate visual bounds for a freehand stroke, including stroke thickness
 * and round end-caps.
 */
export function strokeBounds(stroke: FreehandStroke): Bounds | null {
  if (stroke.length === 0) return null;

  const strokeWidth = (stroke as unknown as { strokeWidth?: number }).strokeWidth ?? STROKE_WIDTH;

  // Single-point stroke renders as a circle dot with radius Math.max(strokeWidth / 2, 1.5)
  if (stroke.length === 1) {
    const p = stroke[0]!;
    const radius = Math.max(strokeWidth / 2, 1.5);
    return {
      left: p.x - radius,
      top: p.y - radius,
      right: p.x + radius,
      bottom: p.y + radius,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pt of stroke) {
    if (pt.x < minX) minX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y > maxY) maxY = pt.y;
  }

  const halfWidth = strokeWidth / 2;
  return {
    left: minX - halfWidth,
    top: minY - halfWidth,
    right: maxX + halfWidth,
    bottom: maxY + halfWidth,
  };
}

/**
 * Calculate visual bounds for a whiteboard element, accounting for stroke width,
 * arrowheads, text metrics, and rotation.
 */
export function elementVisualBounds(
  el: WhiteboardElement,
  context: CanvasRenderingContext2D | null,
): Bounds {
  const sw = el.type === "text" || el.type === "image" ? 0 : (el.strokeWidth ?? STROKE_WIDTH);
  const halfSw = sw / 2;

  if (el.type === "rectangle" || el.type === "roundedRectangle" || el.type === "circle" || el.type === "image") {
    const corners: Point[] = [
      { x: el.x, y: el.y },
      { x: el.x + el.width, y: el.y },
      { x: el.x + el.width, y: el.y + el.height },
      { x: el.x, y: el.y + el.height },
    ];

    if (el.rotation) {
      const center = getElementCenter(el);
      const rotatedCorners = corners.map((c) => rotatePoint(c, center, el.rotation!));
      const b = getBounds(rotatedCorners);
      return {
        left: b.left - halfSw,
        top: b.top - halfSw,
        right: b.right + halfSw,
        bottom: b.bottom + halfSw,
      };
    }

    return {
      left: el.x - halfSw,
      top: el.y - halfSw,
      right: el.x + el.width + halfSw,
      bottom: el.y + el.height + halfSw,
    };
  }

  if (el.type === "line") {
    const pts: Point[] = [
      { x: el.startX, y: el.startY },
      { x: el.endX, y: el.endY },
    ];

    if (el.rotation) {
      const center = getElementCenter(el);
      const rotatedPts = pts.map((p) => rotatePoint(p, center, el.rotation!));
      const b = getBounds(rotatedPts);
      return {
        left: b.left - halfSw,
        top: b.top - halfSw,
        right: b.right + halfSw,
        bottom: b.bottom + halfSw,
      };
    }

    return {
      left: Math.min(el.startX, el.endX) - halfSw,
      top: Math.min(el.startY, el.endY) - halfSw,
      right: Math.max(el.startX, el.endX) + halfSw,
      bottom: Math.max(el.startY, el.endY) + halfSw,
    };
  }

  if (el.type === "arrow") {
    const angle = Math.atan2(el.endY - el.startY, el.endX - el.startX);
    const arrowheadLength = 12;
    const arrowheadAngle = Math.PI / 7;

    const pts: Point[] = [
      { x: el.startX, y: el.startY },
      { x: el.endX, y: el.endY },
      {
        x: el.endX - arrowheadLength * Math.cos(angle - arrowheadAngle),
        y: el.endY - arrowheadLength * Math.sin(angle - arrowheadAngle),
      },
      {
        x: el.endX - arrowheadLength * Math.cos(angle + arrowheadAngle),
        y: el.endY - arrowheadLength * Math.sin(angle + arrowheadAngle),
      },
    ];

    if (el.rotation) {
      const center = getElementCenter(el);
      const rotatedPts = pts.map((p) => rotatePoint(p, center, el.rotation!));
      const b = getBounds(rotatedPts);
      return {
        left: b.left - halfSw,
        top: b.top - halfSw,
        right: b.right + halfSw,
        bottom: b.bottom + halfSw,
      };
    }

    const b = getBounds(pts);
    return {
      left: b.left - halfSw,
      top: b.top - halfSw,
      right: b.right + halfSw,
      bottom: b.bottom + halfSw,
    };
  }

  if (el.type === "text") {
    let unrotatedBounds: Bounds;
    if (context) {
      unrotatedBounds = getTextBounds(context, el);
    } else {
      const lines = el.text.split("\n");
      const lh = el.fontSize * (el.lineHeight ?? 1.2);
      const approxWidth = el.fontSize * 0.6 * Math.max(...lines.map((l) => l.length), 1);
      const totalHeight = Math.max(0, lines.length - 1) * lh + el.fontSize;
      unrotatedBounds = {
        left: el.x,
        top: el.y - el.fontSize,
        right: el.x + approxWidth,
        bottom: el.y - el.fontSize + totalHeight,
      };
    }

    if (el.rotation) {
      const center = getElementCenter(el);
      const corners: Point[] = [
        { x: unrotatedBounds.left, y: unrotatedBounds.top },
        { x: unrotatedBounds.right, y: unrotatedBounds.top },
        { x: unrotatedBounds.right, y: unrotatedBounds.bottom },
        { x: unrotatedBounds.left, y: unrotatedBounds.bottom },
      ];
      const rotatedCorners = corners.map((c) => rotatePoint(c, center, el.rotation!));
      return getBounds(rotatedCorners);
    }

    return unrotatedBounds;
  }

  return { left: 0, top: 0, right: 0, bottom: 0 };
}
