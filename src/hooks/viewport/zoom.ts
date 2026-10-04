import { zoomViewport } from "@/canvas/geometry/geometry";
import type { Viewport } from "@/types/geometry";

type ZoomOptions = {
  viewportRef: { current: Viewport };
  onViewportChange?: (viewport: Viewport) => void;
  setZoom: (zoom: number) => void;
  renderZoomedViewport: (viewport: Viewport) => void;
};

type CanvasRef = { current: HTMLCanvasElement | null };

export function applyZoom(
  newScale: number,
  centerX: number,
  centerY: number,
  { viewportRef, onViewportChange, setZoom, renderZoomedViewport }: ZoomOptions,
) {
  newScale = Math.min(Math.max(newScale, 0.25), 4);
  if (newScale === viewportRef.current.scale) return;

  viewportRef.current = zoomViewport(viewportRef.current, newScale, centerX, centerY);
  onViewportChange?.(viewportRef.current);
  setZoom(newScale);
  renderZoomedViewport(viewportRef.current);
}

export function zoomFromCenter(newScale: number, canvasRef: CanvasRef, options: ZoomOptions) {
  const canvas = canvasRef.current;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  applyZoom(newScale, rect.width / 2, rect.height / 2, options);
}

export function handleNativeWheel(
  event: WheelEvent,
  canvas: HTMLCanvasElement,
  options: ZoomOptions,
) {
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    applyZoom(options.viewportRef.current.scale + delta, x, y, options);
  }
}
