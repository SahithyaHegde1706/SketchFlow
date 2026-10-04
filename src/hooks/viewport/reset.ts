import type { Viewport } from "@/types/geometry";

export function resetViewport(
  viewportRef: { current: Viewport },
  onViewportChange: ((viewport: Viewport) => void) | undefined,
  setZoom: (zoom: number) => void,
) {
  viewportRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
  onViewportChange?.(viewportRef.current);
  setZoom(1);
}
