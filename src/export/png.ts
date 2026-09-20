/**
 * PNG export — Step 35
 *
 * Renders the complete whiteboard document onto an offscreen canvas and
 * triggers a browser file download.
 *
 * - Operates in document/logical coordinates; ignores viewport pan/zoom.
 * - Never draws: selection outlines, handles, guides, grid, UI chrome.
 * - Does NOT modify any editor state, selection, or history.
 * - Clamps output to 4096 px on the longest axis; scales proportionally.
 * - Properly transforms logical coordinates → output pixels so no content is clipped.
 * - Uses the canonical creationOrder array for z-order (reproducing the exact
 *   layer order seen in the editor).
 */

import type { CreationRecord, FreehandStroke, WhiteboardElement } from "@/types/canvas";
import {
  drawRectangle,
  drawCircle,
  drawArrow,
  drawLine,
  drawRoundedRectangle,
  STROKE_COLOR,
  STROKE_WIDTH,
} from "@/canvas/renderer";
import { drawFreehandStroke } from "@/canvas/freehand";
import { drawTextElement } from "@/canvas/text";
import { computeExportBounds } from "@/export/bounds";

/** Maximum pixel dimension for any single axis of the exported PNG. */
export const MAX_DIM = 4096;

/**
 * Export the whiteboard as PNG and trigger a browser download.
 *
 * @param strokes           All freehand strokes.
 * @param elements          All whiteboard elements.
 * @param backgroundColor   Background fill colour (e.g. "#f8fafc").
 * @param creationOrder     Canonical interleaved layer-order array from creationOrderRef.
 */
export function exportToPng(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  backgroundColor: string,
  creationOrder: CreationRecord[] = [],
): void {
  try {
    const bounds = computeExportBounds(strokes, elements);

    const logW = bounds.right - bounds.left;
    const logH = bounds.bottom - bounds.top;

    // Compute proportional scale factor if document exceeds MAX_DIM (4096)
    const renderScale =
      logW > MAX_DIM || logH > MAX_DIM
        ? Math.min(MAX_DIM / logW, MAX_DIM / logH)
        : 1;

    // Physical pixel dimensions of offscreen canvas
    const pixelW = Math.max(1, Math.round(logW * renderScale));
    const pixelH = Math.max(1, Math.round(logH * renderScale));

    const offscreen = document.createElement("canvas");
    offscreen.width = pixelW;
    offscreen.height = pixelH;

    const ctx = offscreen.getContext("2d");
    if (!ctx) return;

    // Scale first, then translate so logical document coordinate (bounds.left, bounds.top)
    // maps directly to canvas pixel (0, 0) and content is never clipped.
    ctx.scale(renderScale, renderScale);
    ctx.translate(-bounds.left, -bounds.top);

    // Background — always covers full logical bounds
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(bounds.left, bounds.top, logW, logH);

    // Draw all content in canonical layer order
    if (creationOrder && creationOrder.length > 0) {
      for (const record of creationOrder) {
        if (record.kind === "stroke") {
          drawCustomStroke(ctx, record.value);
        } else {
          drawElement(ctx, record.value);
        }
      }
    } else {
      // Fallback if creationOrder is empty
      for (const stroke of strokes) {
        drawCustomStroke(ctx, stroke);
      }
      for (const el of elements) {
        drawElement(ctx, el);
      }
    }

    // Create PNG blob and trigger download
    offscreen.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      triggerDownload(url, "sketchflow-board.png");
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, "image/png");
  } catch (err) {
    console.error("[SketchFlow] PNG export failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Drawing helpers
// ---------------------------------------------------------------------------

function drawCustomStroke(ctx: CanvasRenderingContext2D, stroke: FreehandStroke): void {
  const strokeColor =
    (stroke as unknown as { strokeColor?: string; color?: string }).strokeColor ??
    (stroke as unknown as { color?: string }).color ??
    STROKE_COLOR;
  const strokeWidth =
    (stroke as unknown as { strokeWidth?: number; width?: number }).strokeWidth ??
    (stroke as unknown as { width?: number }).width ??
    STROKE_WIDTH;

  drawFreehandStroke(ctx, stroke, strokeColor, strokeWidth);
}

function drawElement(ctx: CanvasRenderingContext2D, el: WhiteboardElement): void {
  if (el.type === "rectangle") drawRectangle(ctx, el);
  else if (el.type === "roundedRectangle") drawRoundedRectangle(ctx, el);
  else if (el.type === "circle") drawCircle(ctx, el);
  else if (el.type === "arrow") drawArrow(ctx, el);
  else if (el.type === "line") drawLine(ctx, el);
  else if (el.type === "text") drawTextElement(ctx, el);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

function triggerDownload(href: string, filename: string): void {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

