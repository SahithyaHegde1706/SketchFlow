import type { Viewport } from "@/types/geometry";
import type { CanvasSettings } from "@/types/canvas";

export function renderGrid(
  context: CanvasRenderingContext2D,
  bounds: DOMRect,
  viewport: Viewport,
  settings: CanvasSettings,
): void {
  if (!settings.showGrid) return;

  context.save();
  const left = -viewport.offsetX / viewport.scale;
  const top = -viewport.offsetY / viewport.scale;
  const right = (bounds.width - viewport.offsetX) / viewport.scale;
  const bottom = (bounds.height - viewport.offsetY) / viewport.scale;

  let activeGridSize = settings.gridSize;
  while (activeGridSize * viewport.scale < 8) {
    activeGridSize *= 2;
  }

  const startX = Math.floor(left / activeGridSize) * activeGridSize;
  const startY = Math.floor(top / activeGridSize) * activeGridSize;

  context.fillStyle = "#cbd5e1";
  context.beginPath();
  for (let x = startX; x < right; x += activeGridSize) {
    for (let y = startY; y < bottom; y += activeGridSize) {
      context.moveTo(x, y);
      context.arc(x, y, 1.5 / viewport.scale, 0, Math.PI * 2);
    }
  }
  context.fill();
  context.restore();
}
