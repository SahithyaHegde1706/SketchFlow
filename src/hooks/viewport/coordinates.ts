import { screenToLogical } from "@/canvas/geometry/geometry";
import type { Point, Viewport } from "@/types/geometry";

export function toLogicalPoint(point: Point, viewport: Viewport) {
  return screenToLogical(point, viewport);
}
