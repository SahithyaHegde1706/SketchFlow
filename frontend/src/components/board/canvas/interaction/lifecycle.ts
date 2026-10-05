import type { PointerEvent } from "react";
import { getCropLocalCoordinates } from "@/editor/cropping";
import type { CropState, DragState, MarqueeState, MultiDragState, RotationState, SelectionSet, Tool } from "@/types/editor";
import type { Point, AlignmentGuide } from "@/types/geometry";
import type { CreationRecord, WhiteboardElement, FreehandStroke } from "@/types/canvas";
import { removeByReference } from "@/editor/deletion";
import { moveSelection } from "@/editor/movement";
import { applyRotation } from "@/editor/rotation";

type Ref<T> = { current: T };
export function cancelCanvasInteraction(options: {
  alignmentGuidesRef: Ref<AlignmentGuide[]>;
  canvasRef: Ref<HTMLCanvasElement | null>;
  activePointerIdRef: Ref<number | null>;
  activeStrokeRef: Ref<FreehandStroke | null>;
  strokesRef: Ref<FreehandStroke[]>;
  creationOrderRef: Ref<CreationRecord[]>;
  multiDragRef: Ref<MultiDragState | null>;
  rotationRef: Ref<RotationState | null>;
  elementsRef: Ref<WhiteboardElement[]>;
  dragRef: Ref<DragState | null>;
  selectionRef: Ref<SelectionSet>;
  marqueeRef: Ref<MarqueeState | null>;
  preMarqueeSelectionRef: Ref<SelectionSet>;
  activeRectangleRef: Ref<import("@/types/canvas").RectangleElement | null>;
  activeRectangleStartRef: Ref<Point | null>;
  activeCircleRef: Ref<import("@/types/canvas").CircleElement | null>;
  activeCircleStartRef: Ref<Point | null>;
  activeArrowRef: Ref<import("@/types/canvas").ArrowElement | null>;
  activeArrowStartRef: Ref<Point | null>;
  activeToolRef: Ref<Tool>;
  restorePan: () => void;
  finishPan: () => void;
  drawCanvas: () => void;
}) {
  options.alignmentGuidesRef.current = [];
  const canvas = options.canvasRef.current;
  const pointerId = options.activePointerIdRef.current;

  if (options.activeStrokeRef.current) {
    const activeStroke = options.activeStrokeRef.current;
    removeByReference(options.strokesRef.current, activeStroke);
    const creationIndex = options.creationOrderRef.current.findIndex(
      record => record.kind === "stroke" && record.value === activeStroke,
    );
    if (creationIndex >= 0) options.creationOrderRef.current.splice(creationIndex, 1);
    options.activeStrokeRef.current = null;
  }

  if (options.multiDragRef.current) {
    options.multiDragRef.current.selections.forEach((selection, index) => {
      const original = options.multiDragRef.current?.originals[index];
      if (original) moveSelection(selection, original, 0, 0);
    });
    options.multiDragRef.current = null;
  }

  if (options.rotationRef.current) {
    const rotation = options.rotationRef.current;
    applyRotation(
      rotation.selections,
      rotation.originals,
      rotation.originalElements,
      0,
      { x: rotation.centerX, y: rotation.centerY },
      options.elementsRef.current,
    );
    options.rotationRef.current = null;
  }

  if (options.dragRef.current) {
    const { selection, original } = options.dragRef.current;
    if (selection.kind === "stroke" && Array.isArray(original)) {
      selection.value.splice(0, selection.value.length, ...original.map(point => ({ ...point })));
    } else if (selection.kind === "element" && !Array.isArray(original)) {
      Object.assign(selection.value, original);
    }
    options.dragRef.current = null;
  }

  if (options.marqueeRef.current) {
    options.marqueeRef.current = null;
    options.selectionRef.current = [...options.preMarqueeSelectionRef.current];
  }

  options.restorePan();
  options.finishPan();
  options.activeRectangleRef.current = null;
  options.activeRectangleStartRef.current = null;
  options.activeCircleRef.current = null;
  options.activeCircleStartRef.current = null;
  options.activeArrowRef.current = null;
  options.activeArrowStartRef.current = null;

  if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  options.activePointerIdRef.current = null;
  if (canvas) canvas.style.cursor = options.activeToolRef.current === "hand" ? "grab" : "";
  options.drawCanvas();
}

export function updateCropPointer(point: Point, crop: CropState) {
  const local = getCropLocalCoordinates(point.x, point.y, crop.element);
  const initial = crop.initialCrop!;
  const dx = local.x - crop.pointerStart!.x;
  const dy = local.y - crop.pointerStart!.y;
  const minSize = 20;

  if (crop.activeHandle === "crop-top-left") {
    crop.left = Math.min(Math.max(0, initial.left + dx), crop.right - minSize);
    crop.top = Math.min(Math.max(0, initial.top + dy), crop.bottom - minSize);
  } else if (crop.activeHandle === "crop-top-right") {
    crop.right = Math.max(Math.min(crop.element.width, initial.right + dx), crop.left + minSize);
    crop.top = Math.min(Math.max(0, initial.top + dy), crop.bottom - minSize);
  } else if (crop.activeHandle === "crop-bottom-left") {
    crop.left = Math.min(Math.max(0, initial.left + dx), crop.right - minSize);
    crop.bottom = Math.max(Math.min(crop.element.height, initial.bottom + dy), crop.top + minSize);
  } else if (crop.activeHandle === "crop-bottom-right") {
    crop.right = Math.max(Math.min(crop.element.width, initial.right + dx), crop.left + minSize);
    crop.bottom = Math.max(Math.min(crop.element.height, initial.bottom + dy), crop.top + minSize);
  }
}

export function finishCropPointer(
  event: Pick<PointerEvent<HTMLCanvasElement>, "pointerId" | "currentTarget">,
  cropRef: Ref<CropState | null>,
  activePointerIdRef: Ref<number | null>,
) {
  if (!cropRef.current || !cropRef.current.activeHandle) return false;
  cropRef.current.activeHandle = undefined;
  cropRef.current.pointerStart = undefined;
  cropRef.current.initialCrop = undefined;
  event.currentTarget.releasePointerCapture(event.pointerId);
  activePointerIdRef.current = null;
  return true;
}
