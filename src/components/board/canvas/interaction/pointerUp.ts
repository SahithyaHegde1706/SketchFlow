import type { PointerEvent } from "react";
import { finishCanvasCreation, type CanvasCreationOptions } from "@/components/board/canvas/creation";
import { finishMarqueeSelection } from "@/components/board/canvas/selection";
import { finishCropPointer } from "./lifecycle";
import type { CropState, DragState, MarqueeState, MultiDragState, RotationState, SelectionSet, Tool } from "@/types/editor";
import type { Viewport, Point, AlignmentGuide } from "@/types/geometry";
import type { CreationRecord, WhiteboardElement, Group } from "@/types/canvas";
import type { DuplicateState } from "@/clipboard/types";
import { resetDuplicateState } from "@/clipboard/clipboard";

type Ref<T> = { current: T };
export type CanvasPointerUpOptions = {
  activeTool: Tool;
  canvasRef: Ref<HTMLCanvasElement | null>;
  viewportRef: Ref<Viewport>;
  activePointerIdRef: Ref<number | null>;
  cropRef: Ref<CropState | null>;
  dragRef: Ref<DragState | null>;
  multiDragRef: Ref<MultiDragState | null>;
  rotationRef: Ref<RotationState | null>;
  marqueeRef: Ref<MarqueeState | null>;
  preMarqueeSelectionRef: Ref<SelectionSet>;
  marqueeShiftRef: Ref<boolean>;
  alignmentGuidesRef: Ref<AlignmentGuide[]>;
  duplicateStateRef: Ref<DuplicateState>;
  selectionRef: Ref<SelectionSet>;
  elementsRef: Ref<WhiteboardElement[]>;
  groupsRef: Ref<Group[]>;
  creationOrderRef: Ref<CreationRecord[]>;
  getPoint: (event: PointerEvent<HTMLCanvasElement>) => Point;
  toLogicalPoint: (point: Point) => Point;
  finishPan: () => void;
  drawCanvas: () => void;
  renderNoPreview: () => void;
  addHistory: () => void;
  onToolSelect: (tool: Tool) => void;
  creationOptions: CanvasCreationOptions;
};

export function createCanvasPointerUpHandler(options: CanvasPointerUpOptions) {
  return (event: PointerEvent<HTMLCanvasElement>) => {
    if (options.activePointerIdRef.current !== event.pointerId) return;

    if (options.cropRef.current && options.cropRef.current.activeHandle) {
      finishCropPointer(event, options.cropRef, options.activePointerIdRef);
      return;
    }

    if (options.activeTool === "hand") {
      options.finishPan();
      options.activePointerIdRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      event.currentTarget.style.cursor = "grab";
      return;
    }

    const createdSelection = finishCanvasCreation(options.activeTool, options.creationOptions);
    if (options.activeTool === "select") {
      if (options.marqueeRef.current) {
        const marquee = options.marqueeRef.current;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        options.activePointerIdRef.current = null;
        options.marqueeRef.current = null;

        if (event.type === "pointercancel") {
          options.selectionRef.current = [...options.preMarqueeSelectionRef.current];
          options.drawCanvas();
          return;
        }

        const point = options.toLogicalPoint(options.getPoint(event));
        finishMarqueeSelection(marquee, point, options.canvasRef.current?.getContext("2d") ?? null, {
          selectionRef: options.selectionRef,
          preMarqueeSelectionRef: options.preMarqueeSelectionRef,
          marqueeShiftRef: options.marqueeShiftRef,
          creationOrderRef: options.creationOrderRef,
          elementsRef: options.elementsRef,
          groupsRef: options.groupsRef,
        });
        options.drawCanvas();
        return;
      }

      const rotation = options.rotationRef.current;
      if (rotation) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        options.rotationRef.current = null;
        options.activePointerIdRef.current = null;
        options.renderNoPreview();
        if (rotation.moved) {
          resetDuplicateState(options.duplicateStateRef.current);
          options.addHistory();
        }
        return;
      }

      const multiDrag = options.multiDragRef.current;
      if (multiDrag) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        if (!multiDrag.moved) {
          options.selectionRef.current = [multiDrag.clicked];
          resetDuplicateState(options.duplicateStateRef.current);
        } else {
          resetDuplicateState(options.duplicateStateRef.current);
        }
        options.multiDragRef.current = null;
        options.dragRef.current = null;
        options.activePointerIdRef.current = null;
        options.alignmentGuidesRef.current = [];
        options.drawCanvas();
        if (multiDrag.moved) options.addHistory();
        return;
      }

      options.dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      options.activePointerIdRef.current = null;
      options.alignmentGuidesRef.current = [];
      options.drawCanvas();
      resetDuplicateState(options.duplicateStateRef.current);
      options.addHistory();
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    options.activePointerIdRef.current = null;
    if (createdSelection) {
      options.selectionRef.current = [createdSelection];
      resetDuplicateState(options.duplicateStateRef.current);
      options.onToolSelect("select");
      options.drawCanvas();
      options.addHistory();
      return;
    }
    options.renderNoPreview();
    options.addHistory();
  };
}
