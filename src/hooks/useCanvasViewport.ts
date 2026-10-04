import { useEffect, useRef, useState } from "react";
import type { FreehandStroke, WhiteboardElement } from "@/types/canvas";
import type { PanState } from "@/types/editor";
import type { Point, Viewport } from "@/types/geometry";
import {
  beginPan as beginPanOperation,
  finishPan as finishPanOperation,
  hasPan as hasPanOperation,
  restorePan as restorePanOperation,
  updatePan as updatePanOperation,
} from "@/hooks/viewport/pan";
import { toLogicalPoint as convertToLogicalPoint } from "@/hooks/viewport/coordinates";
import { fitContentToScreen as fitContentOperation } from "@/hooks/viewport/fitContent";
import { resetViewport as resetViewportOperation } from "@/hooks/viewport/reset";
import { handleNativeWheel, zoomFromCenter as zoomFromCenterOperation } from "@/hooks/viewport/zoom";

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
  const zoomOptions = { viewportRef, onViewportChange, setZoom, renderZoomedViewport };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeWheel = (event: WheelEvent) => {
      handleNativeWheel(event, canvas, zoomOptions);
    };

    canvas.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onNativeWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const beginPan = (screenPoint: Point) => beginPanOperation(panRef, viewportRef, screenPoint);
  const updatePan = (screenPoint: Point) => updatePanOperation(panRef, viewportRef, screenPoint);
  const finishPan = () => finishPanOperation(panRef);
  const hasPan = () => hasPanOperation(panRef);
  const restorePan = () => restorePanOperation(panRef, viewportRef, onViewportChange);
  const toLogicalPoint = (point: Point) => convertToLogicalPoint(point, viewportRef.current);
  const zoomFromCenter = (newScale: number) => zoomFromCenterOperation(newScale, canvasRef, zoomOptions);
  const resetViewport = () => resetViewportOperation(viewportRef, onViewportChange, setZoom);
  const fitContentToScreen = (
    strokes: FreehandStroke[],
    elements: WhiteboardElement[],
    fillRatio: number,
    shouldDraw = false,
  ) => fitContentOperation(
    strokes,
    elements,
    fillRatio,
    canvasRef,
    viewportRef,
    onViewportChange,
    setZoom,
    drawCanvas,
    shouldDraw,
  );

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
