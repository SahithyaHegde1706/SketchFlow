import type { Point, Viewport } from "@/types/geometry";
import type { CreationRecord, FreehandStroke, WhiteboardElement, CanvasSettings, Group } from "@/types/canvas";
import type { Selection, SelectionSet } from "@/types/editor";
import type { DuplicateState } from "@/clipboard/types";
import { resetDuplicateState } from "@/clipboard/clipboard";
import { removeByReference } from "@/editor/deletion";
import { isItemLocked } from "@/editor/locking";
import { removeElementFromGroups } from "@/editor/grouping";
import { selectionIncludes } from "@/components/board/canvas/selection";
import { isPointOnElement, isPointOnStroke } from "@/canvas/interaction/hit-testing";

type Ref<T> = { current: T };
export function createCanvasEraserHandler(options: {
  canvasRef: Ref<HTMLCanvasElement | null>;
  creationOrderRef: Ref<CreationRecord[]>;
  strokesRef: Ref<FreehandStroke[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  groupsRef: Ref<Group[]>;
  selectionRef: Ref<SelectionSet>;
  duplicateStateRef: Ref<DuplicateState>;
  viewportRef: Ref<Viewport>;
  canvasSettings: CanvasSettings;
  handleImageLoaded: () => void;
  addHistory: () => void;
  renderCanvas: () => void;
}) {
  return (point: Point) => {
    const context = options.canvasRef.current?.getContext("2d");
    if (!context) return;

    for (let index = options.creationOrderRef.current.length - 1; index >= 0; index -= 1) {
      const record = options.creationOrderRef.current[index];
      if (!record) continue;

      const isHit = record.kind === "stroke"
        ? isPointOnStroke(point, record.value)
        : isPointOnElement(context, point, record.value);
      if (!isHit || isItemLocked(record as Selection, options.elementsRef.current)) continue;

      if (record.kind === "stroke") {
        removeByReference(options.strokesRef.current, record.value);
      } else {
        removeByReference(options.elementsRef.current, record.value);
        removeElementFromGroups(record.value.id, options.groupsRef.current);
      }
      options.creationOrderRef.current.splice(index, 1);
      options.selectionRef.current = options.selectionRef.current.filter(selection => {
        if (selectionIncludes([record], selection)) return false;
        if (selection.kind === "group" && !options.groupsRef.current.some(group => group.id === selection.value.id)) return false;
        return true;
      });
      options.renderCanvas();
      resetDuplicateState(options.duplicateStateRef.current);
      options.addHistory();
      return;
    }
  };
}
