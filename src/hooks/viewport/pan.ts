import type { PanState } from "@/types/editor";
import type { Point, Viewport } from "@/types/geometry";

type PanRef = { current: PanState | null };
type ViewportRef = { current: Viewport };

export function beginPan(panRef: PanRef, viewportRef: ViewportRef, screenPoint: Point) {
  panRef.current = {
    pointerStartX: screenPoint.x,
    pointerStartY: screenPoint.y,
    originOffsetX: viewportRef.current.offsetX,
    originOffsetY: viewportRef.current.offsetY,
  };
}

export function updatePan(panRef: PanRef, viewportRef: ViewportRef, screenPoint: Point) {
  const pan = panRef.current;
  if (!pan) return;

  viewportRef.current = {
    offsetX: pan.originOffsetX + (screenPoint.x - pan.pointerStartX),
    offsetY: pan.originOffsetY + (screenPoint.y - pan.pointerStartY),
    scale: viewportRef.current.scale,
  };
  return viewportRef.current;
}

export function finishPan(panRef: PanRef) {
  panRef.current = null;
}

export function hasPan(panRef: PanRef) {
  return panRef.current !== null;
}

export function restorePan(
  panRef: PanRef,
  viewportRef: ViewportRef,
  onViewportChange?: (viewport: Viewport) => void,
) {
  if (panRef.current) {
    viewportRef.current = {
      ...viewportRef.current,
      offsetX: panRef.current.originOffsetX,
      offsetY: panRef.current.originOffsetY,
    };
    onViewportChange?.(viewportRef.current);
  }
}
