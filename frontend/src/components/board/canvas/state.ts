import { useRef, useState } from "react";
import type { AlignmentGuide, Point } from "@/types/geometry";
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
import type {
  CropState,
  DragState,
  MarqueeState,
  MultiDragState,
  RotationState,
  SelectionSet,
  TextEditorState,
  Tool,
} from "@/types/editor";
import { createDuplicateState } from "@/clipboard/clipboard";
import type { ClipboardState, DuplicateState } from "@/clipboard/types";
import type { HistoryState } from "@/history/types";

export function useBoardCanvasState(activeTool: Tool) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<FreehandStroke[]>([]);
  const elementsRef = useRef<WhiteboardElement[]>([]);
  const groupsRef = useRef<Group[]>([]);
  const creationOrderRef = useRef<CreationRecord[]>([]);
  const selectionRef = useRef<SelectionSet>([]);
  const dragRef = useRef<DragState | null>(null);
  const multiDragRef = useRef<MultiDragState | null>(null);
  const rotationRef = useRef<RotationState | null>(null);
  const activeStrokeRef = useRef<FreehandStroke | null>(null);
  const clipboardRef = useRef<ClipboardState>({ item: null });
  const duplicateStateRef = useRef<DuplicateState>(createDuplicateState());
  const toolbarSelectionSignatureRef = useRef<string | null>(null);
  const activeRectangleRef = useRef<RectangleElement | null>(null);
  const activeRectangleStartRef = useRef<Point | null>(null);
  const activeCircleRef = useRef<CircleElement | null>(null);
  const activeCircleStartRef = useRef<Point | null>(null);
  const activeArrowRef = useRef<ArrowElement | null>(null);
  const activeArrowStartRef = useRef<Point | null>(null);
  const activeLineRef = useRef<LineElement | null>(null);
  const activeLineStartRef = useRef<Point | null>(null);
  const activeRoundedRectangleRef = useRef<RoundedRectangleElement | null>(null);
  const activeRoundedRectangleStartRef = useRef<Point | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const textEditorRef = useRef<TextEditorState | null>(null);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const historyRef = useRef<HistoryState | null>(null);
  const activeToolRef = useRef(activeTool);
  const keyboardMovementPendingRef = useRef(false);
  /** Transient marquee drag state (logical coords). Null when no drag is active. */
  const marqueeRef = useRef<MarqueeState | null>(null);
  /** Selection that existed before the current marquee started (for Escape restore). */
  const preMarqueeSelectionRef = useRef<SelectionSet>([]);
  /** Whether the marquee was started with Shift held (additive mode). */
  const marqueeShiftRef = useRef(false);
  const alignmentGuidesRef = useRef<AlignmentGuide[]>([]);
  const cropRef = useRef<CropState | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  // Preserve the existing synchronous active-tool ref update used by event handlers.
  // eslint-disable-next-line react-hooks/refs
  activeToolRef.current = activeTool;

  return {
    canvasRef,
    strokesRef,
    elementsRef,
    groupsRef,
    creationOrderRef,
    selectionRef,
    dragRef,
    multiDragRef,
    rotationRef,
    activeStrokeRef,
    clipboardRef,
    duplicateStateRef,
    toolbarSelectionSignatureRef,
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
    textInputRef,
    textEditorRef,
    textEditor,
    setTextEditor,
    activePointerIdRef,
    historyRef,
    activeToolRef,
    keyboardMovementPendingRef,
    marqueeRef,
    preMarqueeSelectionRef,
    marqueeShiftRef,
    alignmentGuidesRef,
    cropRef,
    isCropping,
    setIsCropping,
  };
}

export type BoardCanvasState = ReturnType<typeof useBoardCanvasState>;
