import type { AlignmentGuide, Bounds, Viewport } from "@/types/geometry";
import type { CropState } from "@/types/editor";

export function drawAlignmentGuides(
  context: CanvasRenderingContext2D,
  guides: AlignmentGuide[],
  viewport: Viewport,
) {
  if (guides.length === 0) return;

  context.save();
  context.strokeStyle = "#06b6d4";
  context.lineWidth = 1.5 / viewport.scale;
  context.setLineDash([4 / viewport.scale, 4 / viewport.scale]);

  for (const guide of guides) {
    context.beginPath();
    if (guide.type === "vertical") {
      context.moveTo(guide.position, guide.start);
      context.lineTo(guide.position, guide.end);
    } else {
      context.moveTo(guide.start, guide.position);
      context.lineTo(guide.end, guide.position);
    }
    context.stroke();
  }

  context.restore();
}

export function renderMarquee(
  canvas: HTMLCanvasElement | null,
  marqueeBounds: Bounds,
  viewport: Viewport,
): void {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  if (!context) return;

  const x = marqueeBounds.left;
  const y = marqueeBounds.top;
  const w = marqueeBounds.right - marqueeBounds.left;
  const h = marqueeBounds.bottom - marqueeBounds.top;

  context.save();
  context.translate(viewport.offsetX, viewport.offsetY);
  context.scale(viewport.scale, viewport.scale);

  // Translucent teal fill — same accent colour as selection handles.
  context.fillStyle = "rgba(13, 148, 136, 0.06)";
  context.fillRect(x, y, w, h);

  // Dashed border. Scale the line-width and dash sizes inverse to zoom so they
  // always appear at ~1.5 px regardless of the current zoom level.
  const invScale = 1 / viewport.scale;
  context.strokeStyle = "#0d9488";
  context.lineWidth = 1.5 * invScale;
  context.setLineDash([5 * invScale, 4 * invScale]);
  context.strokeRect(x, y, w, h);

  context.setLineDash([]);
  context.restore();
}

export function renderCropOverlay(
  context: CanvasRenderingContext2D,
  cropState: CropState,
  viewport: Viewport,
): void {
  const el = cropState.element;
  context.save();
  context.translate(viewport.offsetX, viewport.offsetY);
  context.scale(viewport.scale, viewport.scale);

  if (el.rotation) {
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    context.translate(cx, cy);
    context.rotate(el.rotation);
    context.translate(-cx, -cy);
  }

  // Dim the outside of the crop area
  context.fillStyle = "rgba(0, 0, 0, 0.4)";
  context.beginPath();
  context.rect(el.x, el.y, el.width, el.height);
  const cx = el.x + cropState.left;
  const cy = el.y + cropState.top;
  const cw = cropState.right - cropState.left;
  const ch = cropState.bottom - cropState.top;
  context.rect(cx + cw, cy, -cw, ch);
  context.fill("evenodd");

  // Draw crop border
  context.strokeStyle = "#fff";
  context.lineWidth = 1.5 / viewport.scale;
  context.strokeRect(cx, cy, cw, ch);
  context.strokeStyle = "#0ea5e9"; // teal / sky
  context.setLineDash([5 / viewport.scale, 5 / viewport.scale]);
  context.strokeRect(cx, cy, cw, ch);
  context.setLineDash([]);

  // Draw handles
  const handleSize = 8 / viewport.scale;
  context.fillStyle = "#fff";
  context.strokeStyle = "#0ea5e9";
  context.lineWidth = 1.5 / viewport.scale;

  const drawHandle = (x: number, y: number) => {
    context.fillRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
    context.strokeRect(x - handleSize / 2, y - handleSize / 2, handleSize, handleSize);
  };

  drawHandle(cx, cy); // top-left
  drawHandle(cx + cw, cy); // top-right
  drawHandle(cx, cy + ch); // bottom-left
  drawHandle(cx + cw, cy + ch); // bottom-right

  context.restore();
}
