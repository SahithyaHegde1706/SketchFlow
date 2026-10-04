import { createHistory, createSnapshot, record } from "@/history/history";
import { canRedo, canUndo, redo, undo } from "@/history/historyOperations";
import { resetDuplicateState } from "@/clipboard/clipboard";
import type { DuplicateState, ClipboardState } from "@/clipboard/types";
import type { HistoryState, CanvasSnapshot } from "@/history/types";
import type { SketchFlowDocumentV1 } from "@/document/types";
import type {
  ArrowElement,
  CircleElement,
  CreationRecord,
  FreehandStroke,
  Group,
  LineElement,
  RectangleElement,
  RoundedRectangleElement,
  WhiteboardElement,
} from "@/types/canvas";
import type { CropState, DragState, MarqueeState, MultiDragState, RotationState, SelectionSet, TextEditorState } from "@/types/editor";
import type { AlignmentGuide } from "@/types/geometry";

type Ref<T> = { current: T };

export type CanvasDocumentOptions = {
  canvasRef: Ref<HTMLCanvasElement | null>;
  strokesRef: Ref<FreehandStroke[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  groupsRef: Ref<Group[]>;
  creationOrderRef: Ref<CreationRecord[]>;
  selectionRef: Ref<SelectionSet>;
  historyRef: Ref<HistoryState | null>;
  dragRef: Ref<DragState | null>;
  multiDragRef: Ref<MultiDragState | null>;
  rotationRef: Ref<RotationState | null>;
  activeStrokeRef: Ref<FreehandStroke | null>;
  duplicateStateRef: Ref<DuplicateState>;
  clipboardRef: Ref<ClipboardState>;
  activeRectangleRef: Ref<RectangleElement | null>;
  activeRectangleStartRef: Ref<{ x: number; y: number } | null>;
  activeCircleRef: Ref<CircleElement | null>;
  activeCircleStartRef: Ref<{ x: number; y: number } | null>;
  activeArrowRef: Ref<ArrowElement | null>;
  activeArrowStartRef: Ref<{ x: number; y: number } | null>;
  activeLineRef: Ref<LineElement | null>;
  activeLineStartRef: Ref<{ x: number; y: number } | null>;
  activeRoundedRectangleRef: Ref<RoundedRectangleElement | null>;
  activeRoundedRectangleStartRef: Ref<{ x: number; y: number } | null>;
  marqueeRef: Ref<MarqueeState | null>;
  cropRef: Ref<CropState | null>;
  alignmentGuidesRef: Ref<AlignmentGuide[]>;
  setTextEditor: (state: TextEditorState | null) => void;
  setIsCropping: (isCropping: boolean) => void;
  fitContentToScreen: (strokes: FreehandStroke[], elements: WhiteboardElement[], fillRatio: number, shouldDraw?: boolean) => void;
  resetViewport: () => void;
  drawCanvas: () => void;
  renderCanvasViewport: () => void;
  onDocumentChange?: (records: CreationRecord[], groups: Group[], selections: SelectionSet) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onClipboardChange?: (canCopy: boolean, canPaste: boolean, canDuplicate: boolean) => void;
  onAutosave?: () => void;
};

export function createCanvasDocumentHandlers(options: CanvasDocumentOptions) {
  const {
    canvasRef,
    strokesRef,
    elementsRef,
    groupsRef,
    creationOrderRef,
    selectionRef,
    historyRef,
    dragRef,
    multiDragRef,
    rotationRef,
    activeStrokeRef,
    duplicateStateRef,
    clipboardRef,
    activeRectangleRef,
    activeRectangleStartRef,
    activeCircleRef,
    activeCircleStartRef,
    activeArrowRef,
    activeArrowStartRef,
    activeLineRef,
    activeLineStartRef,
    activeRoundedRectangleRef,
    activeRoundedRectangleStartRef,
    marqueeRef,
    cropRef,
    alignmentGuidesRef,
    setTextEditor,
    setIsCropping,
    fitContentToScreen,
    resetViewport,
    drawCanvas,
    renderCanvasViewport,
    onDocumentChange,
    onHistoryChange,
    onClipboardChange,
    onAutosave,
  } = options;

  const addHistory = () => {
    if (!historyRef.current) return;
    historyRef.current = record(
      historyRef.current,
      createSnapshot(strokesRef.current, elementsRef.current, creationOrderRef.current, selectionRef.current, groupsRef.current)
    );
    onHistoryChange?.(canUndo(historyRef.current), canRedo(historyRef.current));
    onDocumentChange?.(creationOrderRef.current, groupsRef.current, selectionRef.current);
    onAutosave?.();
  };

  const initializeHistory = () => {
    historyRef.current = createHistory(
      createSnapshot(strokesRef.current, elementsRef.current, creationOrderRef.current, [], groupsRef.current)
    );
  };

  const applySnapshot = (snapshot: CanvasSnapshot) => {
    strokesRef.current = JSON.parse(JSON.stringify(snapshot.strokes));
    elementsRef.current = JSON.parse(JSON.stringify(snapshot.elements));
    groupsRef.current = JSON.parse(JSON.stringify(snapshot.groups));
    const restoredCreationOrder = JSON.parse(JSON.stringify(snapshot.creationOrder)) as CreationRecord[];
    let restoredStrokeIndex = 0;
    creationOrderRef.current = restoredCreationOrder
      .map(record => {
        if (record.kind === "stroke") {
          const stroke = strokesRef.current[restoredStrokeIndex];
          restoredStrokeIndex += 1;
          return stroke ? { kind: "stroke" as const, value: stroke } : null;
        }

        const element = elementsRef.current.find(item => item.id === record.value.id);
        return element ? { kind: "element" as const, value: element } : null;
      })
      .filter((record): record is CreationRecord => record !== null);

    const restoredSelection: SelectionSet = [];
    for (const selection of snapshot.selection ?? []) {
      if (selection.kind === "stroke") {
        const stroke = strokesRef.current[selection.index];
        if (stroke) restoredSelection.push({ kind: "stroke", value: stroke });
        continue;
      }

      if (selection.kind === "group") {
        const group = groupsRef.current.find(item => item.id === selection.id);
        if (group) restoredSelection.push({ kind: "group", value: group });
        continue;
      }

      const element = elementsRef.current.find(item => item.id === selection.id);
      if (element) restoredSelection.push({ kind: "element", value: element });
    }
    selectionRef.current = restoredSelection;

    renderCanvasViewport();
    onDocumentChange?.(creationOrderRef.current, groupsRef.current, selectionRef.current);
  };

  const handleUndo = () => {
    if (!historyRef.current) return;
    const { newHistory, snapshot } = undo(historyRef.current);
    if (snapshot) {
      historyRef.current = newHistory;
      applySnapshot(snapshot);
      resetDuplicateState(duplicateStateRef.current);
      onHistoryChange?.(canUndo(newHistory), canRedo(newHistory));
      onAutosave?.();
    }
  };

  const handleRedo = () => {
    if (!historyRef.current) return;
    const { newHistory, snapshot } = redo(historyRef.current);
    if (snapshot) {
      historyRef.current = newHistory;
      applySnapshot(snapshot);
      resetDuplicateState(duplicateStateRef.current);
      onHistoryChange?.(canUndo(newHistory), canRedo(newHistory));
      onAutosave?.();
    }
  };

  const handleRestoreDocument = (doc: SketchFlowDocumentV1) => {
    selectionRef.current = [];
    dragRef.current = null;
    multiDragRef.current = null;
    rotationRef.current = null;
    activeStrokeRef.current = null;
    marqueeRef.current = null;
    setTextEditor(null);

    strokesRef.current = doc.strokes;
    elementsRef.current = doc.elements;
    groupsRef.current = doc.groups;

    creationOrderRef.current = doc.creationOrder.map(record => {
      if (record.kind === "stroke") {
        return { kind: "stroke", value: strokesRef.current[record.index]! };
      } else {
        return { kind: "element", value: elementsRef.current.find(element => element.id === record.id)! };
      }
    });

    const context = canvasRef.current?.getContext("2d");
    if (context && (strokesRef.current.length > 0 || elementsRef.current.length > 0)) {
      fitContentToScreen(strokesRef.current, elementsRef.current, 0.8);
    } else {
      resetViewport();
    }

    drawCanvas();
    addHistory();
  };

  const getDocumentState = () => ({
    strokes: strokesRef.current,
    elements: elementsRef.current,
    groups: groupsRef.current,
    creationOrder: creationOrderRef.current,
  });

  const clearDocument = () => {
    strokesRef.current = [];
    elementsRef.current = [];
    groupsRef.current = [];
    creationOrderRef.current = [];
    selectionRef.current = [];
    dragRef.current = null;
    multiDragRef.current = null;
    rotationRef.current = null;
    activeStrokeRef.current = null;
    activeRectangleRef.current = null;
    activeRectangleStartRef.current = null;
    activeCircleRef.current = null;
    activeCircleStartRef.current = null;
    activeArrowRef.current = null;
    activeArrowStartRef.current = null;
    activeLineRef.current = null;
    activeLineStartRef.current = null;
    activeRoundedRectangleRef.current = null;
    activeRoundedRectangleStartRef.current = null;
    marqueeRef.current = null;
    cropRef.current = null;
    setIsCropping(false);
    setTextEditor(null);
    clipboardRef.current = { item: null };
    resetDuplicateState(duplicateStateRef.current);
    alignmentGuidesRef.current = [];
    historyRef.current = createHistory(
      createSnapshot(
        strokesRef.current,
        elementsRef.current,
        creationOrderRef.current,
        selectionRef.current,
        groupsRef.current,
      ),
    );
    drawCanvas();
    onDocumentChange?.(creationOrderRef.current, groupsRef.current, selectionRef.current);
    onHistoryChange?.(false, false);
    onClipboardChange?.(false, false, false);
  };

  return {
    addHistory,
    initializeHistory,
    handleUndo,
    handleRedo,
    handleRestoreDocument,
    getDocumentState,
    clearDocument,
  };
}
