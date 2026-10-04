import type { Selection, SelectionSet, DragState, MarqueeState, MultiDragState, RotationState } from "@/types/editor";
import type { WhiteboardElement, CreationRecord } from "@/types/canvas";
import { resetDuplicateState } from "@/clipboard/clipboard";
import type { DuplicateState } from "@/clipboard/types";
import { findSelectionAtPoint } from "@/canvas/interaction/hit-testing";
import { findResizeHandleAtPoint, getCombinedSelectionBounds } from "@/canvas/interaction/selection";
import { cloneSelectionValue } from "@/editor/tools";
import { isAnySelectionLocked, isItemLocked } from "@/editor/locking";
import type { Point, ResizeHandle } from "@/types/geometry";
import { getMarqueeSelections, MIN_MARQUEE_DISTANCE, normalizeMarqueeBounds, unionSelections } from "@/editor/marquee";

type Ref<T> = { current: T };

export function selectionIncludes(selections: SelectionSet, candidate: Selection) {
  return selections.some(selection => selection.kind === candidate.kind && (
    selection.value === candidate.value ||
    (selection.kind === "element" && candidate.kind === "element" && selection.value.id === candidate.value.id) ||
    (selection.kind === "group" && candidate.kind === "group" && selection.value.id === candidate.value.id)
  ));
}

export function flattenSelection(selections: SelectionSet, elements: WhiteboardElement[]): SelectionSet {
  const flat: SelectionSet = [];
  for (const selection of selections) {
    if (selection.kind === "group") {
      for (const id of selection.value.elementIds) {
        const element = elements.find(candidate => candidate.id === id);
        if (element && !flat.some(item => item.kind === "element" && item.value.id === id)) {
          flat.push({ kind: "element", value: element });
        }
      }
    } else {
      flat.push(selection);
    }
  }
  return flat;
}

export function setSelection(
  selectionRef: Ref<SelectionSet>,
  selections: SelectionSet,
  duplicateStateRef: Ref<DuplicateState>,
  drawCanvas: () => void,
) {
  selectionRef.current = [...selections];
  resetDuplicateState(duplicateStateRef.current);
  drawCanvas();
}

export type MarqueeSelectionOptions = {
  selectionRef: Ref<SelectionSet>;
  preMarqueeSelectionRef: Ref<SelectionSet>;
  marqueeShiftRef: Ref<boolean>;
  creationOrderRef: Ref<CreationRecord[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  groupsRef: Ref<import("@/types/canvas").Group[]>;
};

export function updateMarqueeSelection(
  marquee: MarqueeState,
  point: Point,
  context: CanvasRenderingContext2D | null,
  options: MarqueeSelectionOptions,
) {
  marquee.currentX = point.x;
  marquee.currentY = point.y;
  const dx = Math.abs(marquee.currentX - marquee.startX);
  const dy = Math.abs(marquee.currentY - marquee.startY);

  if (dx >= MIN_MARQUEE_DISTANCE || dy >= MIN_MARQUEE_DISTANCE) {
    if (context) {
      const marqueeSelections = getMarqueeSelections(
        context,
        normalizeMarqueeBounds(marquee),
        options.creationOrderRef.current,
        options.elementsRef.current,
        options.groupsRef.current,
      );
      options.selectionRef.current = options.marqueeShiftRef.current
        ? unionSelections(options.preMarqueeSelectionRef.current, marqueeSelections)
        : marqueeSelections;
    }
  } else if (options.marqueeShiftRef.current) {
    options.selectionRef.current = [...options.preMarqueeSelectionRef.current];
  }
}

export function finishMarqueeSelection(
  marquee: MarqueeState,
  point: Point,
  context: CanvasRenderingContext2D | null,
  options: MarqueeSelectionOptions,
) {
  const dx = Math.abs(point.x - marquee.startX);
  const dy = Math.abs(point.y - marquee.startY);

  if (dx >= MIN_MARQUEE_DISTANCE || dy >= MIN_MARQUEE_DISTANCE) {
    if (context) {
      const marqueeSelections = getMarqueeSelections(
        context,
        normalizeMarqueeBounds({ ...marquee, currentX: point.x, currentY: point.y }),
        options.creationOrderRef.current,
        options.elementsRef.current,
        options.groupsRef.current,
      );
      options.selectionRef.current = options.marqueeShiftRef.current
        ? unionSelections(options.preMarqueeSelectionRef.current, marqueeSelections)
        : marqueeSelections;
    }
  } else {
    options.selectionRef.current = options.marqueeShiftRef.current
      ? [...options.preMarqueeSelectionRef.current]
      : [];
  }
}

export function beginSelectionPointer(
  event: { pointerId: number; shiftKey: boolean; currentTarget: HTMLCanvasElement },
  point: Point,
  context: CanvasRenderingContext2D | null,
  options: {
    selectionRef: Ref<SelectionSet>;
    creationOrderRef: Ref<CreationRecord[]>;
    elementsRef: Ref<WhiteboardElement[]>;
    dragRef: Ref<DragState | null>;
    multiDragRef: Ref<MultiDragState | null>;
    rotationRef: Ref<RotationState | null>;
    activePointerIdRef: Ref<number | null>;
    preMarqueeSelectionRef: Ref<SelectionSet>;
    marqueeShiftRef: Ref<boolean>;
    marqueeRef: Ref<MarqueeState | null>;
    duplicateStateRef: Ref<DuplicateState>;
  },
) {
  const currentSelection = options.selectionRef.current;
  const clickedSelection = context
    ? findSelectionAtPoint(context, point, options.creationOrderRef.current, true)
    : null;

  let clickedHandle: ResizeHandle | null = null;
  if (currentSelection.length > 0 && context) {
    clickedHandle = findResizeHandleAtPoint(context, point, currentSelection, options.elementsRef.current);
  }

  if (clickedHandle === "rotate" && currentSelection.length > 0) {
    if (!isAnySelectionLocked(currentSelection, options.elementsRef.current)) {
      const bounds = getCombinedSelectionBounds(context!, currentSelection, options.elementsRef.current);
      const centerX = (bounds.left + bounds.right) / 2;
      const centerY = (bounds.top + bounds.bottom) / 2;
      const flatSelections = flattenSelection(currentSelection, options.elementsRef.current);
      options.rotationRef.current = {
        selections: flatSelections,
        originals: flatSelections.map(selection => cloneSelectionValue(selection)),
        originalElements: options.elementsRef.current.map(element => ({ ...element })),
        centerX,
        centerY,
        initialPointerAngle: Math.atan2(point.y - centerY, point.x - centerX),
        moved: false,
      };
      options.activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  } else if (clickedHandle && currentSelection.length === 1) {
    const selection = currentSelection[0]!;
    if (!isItemLocked(selection, options.elementsRef.current)) {
      options.dragRef.current = {
        selection,
        pointerStart: point,
        original: cloneSelectionValue(selection),
        type: "resize",
        handle: clickedHandle,
      };
      options.activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  } else if (event.shiftKey && clickedSelection) {
    options.selectionRef.current = selectionIncludes(currentSelection, clickedSelection)
      ? currentSelection.filter(selection => !selectionIncludes([selection], clickedSelection))
      : [...currentSelection, clickedSelection];
    resetDuplicateState(options.duplicateStateRef.current);
    options.dragRef.current = null;
    options.multiDragRef.current = null;
  } else if (clickedSelection) {
    const wasSelected = selectionIncludes(currentSelection, clickedSelection);
    const activeSelection = wasSelected ? currentSelection : [clickedSelection];
    const flatSelections = flattenSelection(activeSelection, options.elementsRef.current);
    const movableSelections = flatSelections.filter(selection => !isItemLocked(selection, options.elementsRef.current));

    if (!wasSelected) {
      options.selectionRef.current = [clickedSelection];
      resetDuplicateState(options.duplicateStateRef.current);
    }

    if (movableSelections.length > 0) {
      const originalBounds = context
        ? getCombinedSelectionBounds(context, movableSelections, options.elementsRef.current)
        : undefined;
      options.multiDragRef.current = {
        selections: movableSelections,
        originals: movableSelections.map(selection => cloneSelectionValue(selection)),
        pointerStart: point,
        clicked: clickedSelection,
        moved: false,
        originalBounds,
      };
      options.activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
    } else {
      options.dragRef.current = null;
      options.multiDragRef.current = null;
    }
  } else {
    options.preMarqueeSelectionRef.current = [...currentSelection];
    options.marqueeShiftRef.current = event.shiftKey;
    options.marqueeRef.current = {
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    };
    options.activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    options.dragRef.current = null;
    options.multiDragRef.current = null;
    resetDuplicateState(options.duplicateStateRef.current);
  }
}
