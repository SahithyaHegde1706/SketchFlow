import type { PointerEvent } from "react";
import {
  beginCanvasCreation,
  type CanvasCreationOptions,
} from "@/components/board/canvas/creation";
import { beginSelectionPointer } from "@/components/board/canvas/selection";
import { getCropLocalCoordinates } from "@/editor/cropping";
import type { CropState, DragState, MarqueeState, MultiDragState, RotationState, SelectionSet, Tool } from "@/types/editor";
import type { Viewport, Point } from "@/types/geometry";
import type { CreationRecord, WhiteboardElement } from "@/types/canvas";
import type { DuplicateState } from "@/clipboard/types";

type Ref<T> = { current: T };
export type CanvasPointerDownOptions = {
  activeTool: Tool;
  canvasRef: Ref<HTMLCanvasElement | null>;
  viewportRef: Ref<Viewport>;
  cropRef: Ref<CropState | null>;
  activePointerIdRef: Ref<number | null>;
  selectionRef: Ref<SelectionSet>;
  creationOrderRef: Ref<CreationRecord[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  dragRef: Ref<DragState | null>;
  multiDragRef: Ref<MultiDragState | null>;
  rotationRef: Ref<RotationState | null>;
  preMarqueeSelectionRef: Ref<SelectionSet>;
  marqueeShiftRef: Ref<boolean>;
  marqueeRef: Ref<MarqueeState | null>;
  duplicateStateRef: Ref<DuplicateState>;
  getPoint: (event: PointerEvent<HTMLCanvasElement>) => Point;
  toLogicalPoint: (point: Point) => Point;
  beginPan: (point: Point) => void;
  drawCanvas: () => void;
  renderPreview: () => void;
  eraseAtPoint: (point: Point) => void;
  creationOptions: CanvasCreationOptions;
};

export function createCanvasPointerDownHandler(options: CanvasPointerDownOptions) {
  return (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;

    if (options.cropRef.current) {
      event.currentTarget.setPointerCapture(event.pointerId);
      options.activePointerIdRef.current = event.pointerId;
      const point = options.getPoint(event);
      const logical = options.toLogicalPoint(point);
      const crop = options.cropRef.current;
      const local = getCropLocalCoordinates(logical.x, logical.y, crop.element);
      const handleSize = 10 / options.viewportRef.current.scale;

      if (Math.abs(local.x - crop.left) < handleSize && Math.abs(local.y - crop.top) < handleSize) crop.activeHandle = "crop-top-left";
      else if (Math.abs(local.x - crop.right) < handleSize && Math.abs(local.y - crop.top) < handleSize) crop.activeHandle = "crop-top-right";
      else if (Math.abs(local.x - crop.left) < handleSize && Math.abs(local.y - crop.bottom) < handleSize) crop.activeHandle = "crop-bottom-left";
      else if (Math.abs(local.x - crop.right) < handleSize && Math.abs(local.y - crop.bottom) < handleSize) crop.activeHandle = "crop-bottom-right";

      if (crop.activeHandle) {
        crop.pointerStart = local;
        crop.initialCrop = { left: crop.left, top: crop.top, right: crop.right, bottom: crop.bottom };
      }
      return;
    }

    if (options.activeTool === "text") return;

    const screenPoint = options.getPoint(event);
    if (options.activeTool === "hand") {
      options.beginPan(screenPoint);
      options.activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.style.cursor = "grabbing";
      return;
    }

    const point = options.toLogicalPoint(screenPoint);
    if (options.activeTool === "select") {
      const context = options.canvasRef.current?.getContext("2d") ?? null;
      beginSelectionPointer(event, point, context, options);
      options.drawCanvas();
      return;
    }

    if (options.activeTool === "eraser") {
      options.eraseAtPoint(point);
      return;
    }

    options.activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    beginCanvasCreation(options.activeTool, point, options.creationOptions);
    options.renderPreview();
  };
}
