import type { PointerEvent } from "react";
import {
  updateCanvasCreation,
  type CanvasCreationOptions,
} from "@/components/board/canvas/creation";
import { updateMarqueeSelection } from "@/components/board/canvas/selection";
import { updateCropPointer } from "./lifecycle";
import type { CropState, DragState, MarqueeState, MultiDragState, RotationState, SelectionSet, Tool } from "@/types/editor";
import type { Viewport, Point, AlignmentGuide } from "@/types/geometry";
import type { CreationRecord, WhiteboardElement, FreehandStroke, CanvasSettings, Group } from "@/types/canvas";
import { moveSelection } from "@/editor/movement";
import { applyRotation } from "@/editor/rotation";
import { calculateSnap } from "@/editor/snapping";
import { resizeSelection } from "@/editor/resizing";
import { findSelectionAtPoint } from "@/canvas/interaction/hit-testing";
import { findResizeHandleAtPoint, getSelectionBounds } from "@/canvas/interaction/selection";

type Ref<T> = { current: T };
export type CanvasPointerMoveOptions = {
  activeTool: Tool;
  canvasRef: Ref<HTMLCanvasElement | null>;
  viewportRef: Ref<Viewport>;
  canvasSettings: CanvasSettings;
  activePointerIdRef: Ref<number | null>;
  cropRef: Ref<CropState | null>;
  activeStrokeRef: Ref<FreehandStroke | null>;
  strokesRef: Ref<FreehandStroke[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  groupsRef: Ref<Group[]>;
  creationOrderRef: Ref<CreationRecord[]>;
  selectionRef: Ref<SelectionSet>;
  dragRef: Ref<DragState | null>;
  multiDragRef: Ref<MultiDragState | null>;
  rotationRef: Ref<RotationState | null>;
  marqueeRef: Ref<MarqueeState | null>;
  preMarqueeSelectionRef: Ref<SelectionSet>;
  marqueeShiftRef: Ref<boolean>;
  alignmentGuidesRef: Ref<AlignmentGuide[]>;
  getPoint: (event: PointerEvent<HTMLCanvasElement>) => Point;
  toLogicalPoint: (point: Point) => Point;
  updatePan: (point: Point) => void;
  hasPan: () => boolean;
  drawCanvas: () => void;
  renderPreview: () => void;
  renderNoPreview: () => void;
  creationOptions: CanvasCreationOptions;
};

export function createCanvasPointerMoveHandler(options: CanvasPointerMoveOptions) {
  return (event: PointerEvent<HTMLCanvasElement>) => {
    const screenPoint = options.getPoint(event);

    if (options.activePointerIdRef.current === event.pointerId && options.cropRef.current && options.cropRef.current.activeHandle) {
      const logical = options.toLogicalPoint(screenPoint);
      updateCropPointer(logical, options.cropRef.current);
      options.drawCanvas();
      return;
    }

    if (options.activePointerIdRef.current === event.pointerId && options.activeTool === "hand" && options.hasPan()) {
      options.updatePan(screenPoint);
      options.renderPreview();
      return;
    }

    const point = options.toLogicalPoint(screenPoint);
    if (options.activePointerIdRef.current !== event.pointerId) {
      if (options.activeTool === "hand") {
        event.currentTarget.style.cursor = "grab";
        return;
      }

      if (options.activeTool === "select") {
        const currentSelection = options.selectionRef.current;
        const context = options.canvasRef.current?.getContext("2d");
        if (currentSelection.length > 0 && context) {
          const hoveredHandle = findResizeHandleAtPoint(context, point, currentSelection, options.elementsRef.current);
          if (hoveredHandle === "rotate") {
            event.currentTarget.style.cursor = "grab";
          } else if (hoveredHandle === "top-left" || hoveredHandle === "bottom-right") {
            event.currentTarget.style.cursor = "nwse-resize";
          } else if (hoveredHandle === "top-right" || hoveredHandle === "bottom-left") {
            event.currentTarget.style.cursor = "nesw-resize";
          } else if (findSelectionAtPoint(context, point, options.creationOrderRef.current, true)) {
            event.currentTarget.style.cursor = "move";
          } else {
            event.currentTarget.style.cursor = "default";
          }
        } else {
          event.currentTarget.style.cursor = "default";
        }
      } else {
        event.currentTarget.style.cursor = "";
      }
      return;
    }

    if (options.activeTool === "select") {
      const rotation = options.rotationRef.current;
      if (rotation) {
        let deltaAngle = Math.atan2(point.y - rotation.centerY, point.x - rotation.centerX)
          - rotation.initialPointerAngle;
        if (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
        else if (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;

        applyRotation(
          rotation.selections,
          rotation.originals,
          rotation.originalElements,
          deltaAngle,
          { x: rotation.centerX, y: rotation.centerY },
          options.elementsRef.current,
        );
        rotation.moved = rotation.moved || Math.abs(deltaAngle) > 0.0001;
        options.alignmentGuidesRef.current = [];
        options.drawCanvas();
        return;
      }

      if (options.activePointerIdRef.current === event.pointerId && options.marqueeRef.current) {
        updateMarqueeSelection(options.marqueeRef.current, point, options.canvasRef.current?.getContext("2d") ?? null, {
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

      const multiDrag = options.multiDragRef.current;
      if (multiDrag) {
        const rawDeltaX = point.x - multiDrag.pointerStart.x;
        const rawDeltaY = point.y - multiDrag.pointerStart.y;
        let deltaX = rawDeltaX;
        let deltaY = rawDeltaY;
        const context = options.canvasRef.current?.getContext("2d");
        if (context && multiDrag.originalBounds && options.canvasSettings.snapSettings?.enabled) {
          const rect = options.canvasRef.current?.getBoundingClientRect();
          const canvasDimensions = rect ? { width: rect.width, height: rect.height } : { width: 800, height: 600 };
          const snapResult = calculateSnap(
            context,
            multiDrag.selections,
            options.elementsRef.current,
            options.strokesRef.current,
            options.groupsRef.current,
            multiDrag.originalBounds,
            rawDeltaX,
            rawDeltaY,
            options.viewportRef.current,
            canvasDimensions,
            options.canvasSettings.snapSettings,
          );
          deltaX = snapResult.snappedDeltaX;
          deltaY = snapResult.snappedDeltaY;
          options.alignmentGuidesRef.current = snapResult.guides;
        } else {
          options.alignmentGuidesRef.current = [];
        }

        multiDrag.selections.forEach((selection, index) => {
          const original = multiDrag.originals[index];
          if (original) moveSelection(selection, original, deltaX, deltaY);
        });
        multiDrag.moved = multiDrag.moved || rawDeltaX !== 0 || rawDeltaY !== 0;
        options.drawCanvas();
        return;
      }

      const drag = options.dragRef.current;
      if (drag) {
        if (drag.type === "resize" && drag.handle) {
          options.alignmentGuidesRef.current = [];
          resizeSelection(
            drag.selection,
            drag.original as FreehandStroke | WhiteboardElement,
            point.x - drag.pointerStart.x,
            point.y - drag.pointerStart.y,
            drag.handle,
            options.canvasRef.current?.getContext("2d") ?? undefined,
          );
        } else {
          const rawDeltaX = point.x - drag.pointerStart.x;
          const rawDeltaY = point.y - drag.pointerStart.y;
          let deltaX = rawDeltaX;
          let deltaY = rawDeltaY;
          const context = options.canvasRef.current?.getContext("2d");
          const origBounds = context ? getSelectionBounds(context, drag.selection, options.elementsRef.current) : undefined;
          if (context && origBounds && options.canvasSettings.snapSettings?.enabled) {
            const rect = options.canvasRef.current?.getBoundingClientRect();
            const canvasDimensions = rect ? { width: rect.width, height: rect.height } : { width: 800, height: 600 };
            const snapResult = calculateSnap(
              context,
              [drag.selection],
              options.elementsRef.current,
              options.strokesRef.current,
              options.groupsRef.current,
              origBounds,
              rawDeltaX,
              rawDeltaY,
              options.viewportRef.current,
              canvasDimensions,
              options.canvasSettings.snapSettings,
            );
            deltaX = snapResult.snappedDeltaX;
            deltaY = snapResult.snappedDeltaY;
            options.alignmentGuidesRef.current = snapResult.guides;
          } else {
            options.alignmentGuidesRef.current = [];
          }
          moveSelection(drag.selection, drag.original, deltaX, deltaY);
        }
        options.drawCanvas();
      }
      return;
    }

    updateCanvasCreation(options.activeTool, point, options.creationOptions);
    options.renderPreview();
  };
}
