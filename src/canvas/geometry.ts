import type { Bounds, FreehandStroke, Point, Viewport } from "@/types/canvas";

export function distanceBetweenPoints(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

export function distanceToSegment(point: Point, start: Point, end: Point) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const segmentLengthSquared = deltaX * deltaX + deltaY * deltaY;

  if (segmentLengthSquared === 0) {
    return distanceBetweenPoints(point, start);
  }

  const projection = Math.max(
    0,
    Math.min(
      1,
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / segmentLengthSquared,
    ),
  );
  const closestPoint = {
    x: start.x + projection * deltaX,
    y: start.y + projection * deltaY,
  };

  return distanceBetweenPoints(point, closestPoint);
}

export function getBounds(points: Point[]): Bounds {
  return points.reduce(
    (bounds, point) => ({
      left: Math.min(bounds.left, point.x),
      top: Math.min(bounds.top, point.y),
      right: Math.max(bounds.right, point.x),
      bottom: Math.max(bounds.bottom, point.y),
    }),
    { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity },
  );
}

export function getStrokeBounds(stroke: FreehandStroke): Bounds {
  return getBounds(stroke.length > 0 ? stroke : [{ x: 0, y: 0 }]);
}

export function screenToLogical(point: Point, viewport: Viewport): Point {
  return {
    x: (point.x - viewport.offsetX) / viewport.scale,
    y: (point.y - viewport.offsetY) / viewport.scale,
  };
}

export function logicalToScreen(point: Point, viewport: Viewport): Point {
  return {
    x: point.x * viewport.scale + viewport.offsetX,
    y: point.y * viewport.scale + viewport.offsetY,
  };
}

export function zoomViewport(
  viewport: Viewport,
  newScale: number,
  zoomCenterX: number,
  zoomCenterY: number,
): Viewport {
  const logicalX = (zoomCenterX - viewport.offsetX) / viewport.scale;
  const logicalY = (zoomCenterY - viewport.offsetY) / viewport.scale;

  return {
    offsetX: zoomCenterX - logicalX * newScale,
    offsetY: zoomCenterY - logicalY * newScale,
    scale: newScale,
  };
}

export function rotatePoint(point: Point, center: Point, angle: number): Point {
  if (!angle) return point;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const deltaX = point.x - center.x;
  const deltaY = point.y - center.y;

  return {
    x: center.x + deltaX * cos - deltaY * sin,
    y: center.y + deltaX * sin + deltaY * cos,
  };
}
