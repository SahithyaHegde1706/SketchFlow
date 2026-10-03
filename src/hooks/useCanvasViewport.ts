import { useEffect, useRef, useState } from "react";
import { screenToLogical, zoomViewport } from "@/canvas/geometry/geometry";
import type { FreehandStroke, PanState, Point, Viewport, WhiteboardElement } from "@/types/canvas";

type UseCanvasViewportOptions = {
  canvasRef: { current: HTMLCanvasElement | null };
  onViewportChange?: (viewport: Viewport) => void;
  renderZoomedViewport: (viewport: Viewport) => void;
  drawCanvas: () => void;
};

export function useCanvasViewport({
  canvasRef,
  onViewportChange,
  renderZoomedViewport,
  drawCanvas,
}: UseCanvasViewportOptions) {
  const viewportRef = useRef<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 });
  const panRef = useRef<PanState | null>(null);
  const [zoom, setZoom] = useState(1);

  const applyZoom = (newScale: number, centerX: number, centerY: number) => {
    newScale = Math.min(Math.max(newScale, 0.25), 4);
    if (newScale === viewportRef.current.scale) return;

    viewportRef.current = zoomViewport(viewportRef.current, newScale, centerX, centerY);
    onViewportChange?.(viewportRef.current);
    setZoom(newScale);
    renderZoomedViewport(viewportRef.current);
  };

  const zoomFromCenter = (newScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    applyZoom(newScale, rect.width / 2, rect.height / 2);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        applyZoom(viewportRef.current.scale + delta, x, y);
      }
    };

    canvas.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onNativeWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginPan = (screenPoint: Point) => {
    panRef.current = {
      pointerStartX: screenPoint.x,
      pointerStartY: screenPoint.y,
      originOffsetX: viewportRef.current.offsetX,
      originOffsetY: viewportRef.current.offsetY,
    };
  };

  const updatePan = (screenPoint: Point) => {
    const pan = panRef.current;
    if (!pan) return;

    viewportRef.current = {
      offsetX: pan.originOffsetX + (screenPoint.x - pan.pointerStartX),
      offsetY: pan.originOffsetY + (screenPoint.y - pan.pointerStartY),
      scale: viewportRef.current.scale,
    };
    return viewportRef.current;
  };

  const finishPan = () => {
    panRef.current = null;
  };

  const hasPan = () => panRef.current !== null;

  const restorePan = () => {
    if (panRef.current) {
      viewportRef.current = {
        ...viewportRef.current,
        offsetX: panRef.current.originOffsetX,
        offsetY: panRef.current.originOffsetY,
      };
      onViewportChange?.(viewportRef.current);
    }
  };

  const toLogicalPoint = (point: Point) => screenToLogical(point, viewportRef.current);

  const resetViewport = () => {
    viewportRef.current = { scale: 1, offsetX: 0, offsetY: 0 };
    onViewportChange?.(viewportRef.current);
    setZoom(1);
  };

  const fitContentToScreen = (
    strokes: FreehandStroke[],
    elements: WhiteboardElement[],
    fillRatio: number,
    shouldDraw = false,
  ) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const checkPoint = (point: Point) => {
      if (point.x < minX) minX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.x > maxX) maxX = point.x;
      if (point.y > maxY) maxY = point.y;
    };

    for (const stroke of strokes) stroke.forEach(checkPoint);
    for (const element of elements) {
      const startX = "x" in element ? element.x : element.startX;
      const startY = "y" in element ? element.y : element.startY;
      checkPoint({ x: startX, y: startY });
      if (element.type === "rectangle" || element.type === "roundedRectangle" || element.type === "circle") {
        checkPoint({ x: element.x + element.width, y: element.y + element.height });
      } else if (element.type === "line" || element.type === "arrow") {
        checkPoint({ x: element.endX, y: element.endY });
      }
    }

    const canvas = canvasRef.current;
    if (minX !== Infinity && canvas) {
      const boundsWidth = maxX - minX;
      const boundsHeight = maxY - minY;
      const canvasRect = canvas.getBoundingClientRect();
      const scaleX = (canvasRect.width * fillRatio) / Math.max(boundsWidth, 1);
      const scaleY = (canvasRect.height * fillRatio) / Math.max(boundsHeight, 1);
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.25), 2);
      const centerX = minX + boundsWidth / 2;
      const centerY = minY + boundsHeight / 2;

      viewportRef.current = {
        scale: newScale,
        offsetX: canvasRect.width / 2 - centerX * newScale,
        offsetY: canvasRect.height / 2 - centerY * newScale,
      };
      onViewportChange?.(viewportRef.current);
      setZoom(newScale);
      if (shouldDraw) drawCanvas();
    }
  };

  return {
    viewportRef,
    zoom,
    toLogicalPoint,
    beginPan,
    updatePan,
    hasPan,
    finishPan,
    restorePan,
    zoomFromCenter,
    resetViewport,
    fitContentToScreen,
  };
}
