import { useCanvasKeyboard } from "@/hooks/useCanvasKeyboard";
import { createCanvasKeyboardMovementHandlers } from "./editing";
import { cancelCanvasInteraction } from "./interaction";
import type { BoardCanvasState } from "./state";
import type { createBoardCanvasEditingHandlers } from "./handlers/handlers";
import type { useBoardCanvasDrawing } from "./drawing";
import type { Tool } from "@/types/editor";

type EditingHandlers = ReturnType<typeof createBoardCanvasEditingHandlers>;
type DrawingControls = ReturnType<typeof useBoardCanvasDrawing>;

function clearKeyboardSelection(selectionRef: BoardCanvasState["selectionRef"], draw: () => void) {
  selectionRef.current = [];
  draw();
}

export function useBoardCanvasKeyboard(options: {
  state: BoardCanvasState;
  drawing: Pick<DrawingControls, "drawCanvas" | "renderCanvasFrame">;
  pan: {
    restorePan: () => void;
    finishPan: () => void;
  };
  editingHandlers: Pick<EditingHandlers,
    | "notifyClipboardChange"
    | "handleLock"
    | "handleUnlock"
    | "handleGroup"
    | "handleUngroup"
    | "handleLayerOperation"
    | "handleCopy"
    | "handlePaste"
    | "handleDuplicate"
    | "handleDeleteSelection"
  >;
  historyHandlers: {
    handleUndo: () => void;
    handleRedo: () => void;
  };
  addHistory: () => void;
  onToolSelect: (tool: Tool) => void;
  cancelText: () => void;
  commitText: () => void;
}) {
  const { state, drawing, pan, editingHandlers, addHistory, onToolSelect } = options;
  const cancelInteraction = () => cancelCanvasInteraction({
    alignmentGuidesRef: state.alignmentGuidesRef,
    canvasRef: state.canvasRef,
    activePointerIdRef: state.activePointerIdRef,
    activeStrokeRef: state.activeStrokeRef,
    strokesRef: state.strokesRef,
    creationOrderRef: state.creationOrderRef,
    multiDragRef: state.multiDragRef,
    rotationRef: state.rotationRef,
    elementsRef: state.elementsRef,
    dragRef: state.dragRef,
    selectionRef: state.selectionRef,
    marqueeRef: state.marqueeRef,
    preMarqueeSelectionRef: state.preMarqueeSelectionRef,
    activeRectangleRef: state.activeRectangleRef,
    activeRectangleStartRef: state.activeRectangleStartRef,
    activeCircleRef: state.activeCircleRef,
    activeCircleStartRef: state.activeCircleStartRef,
    activeArrowRef: state.activeArrowRef,
    activeArrowStartRef: state.activeArrowStartRef,
    activeToolRef: state.activeToolRef,
    restorePan: pan.restorePan,
    finishPan: pan.finishPan,
    drawCanvas: drawing.drawCanvas,
  });

  const { moveSelectedByKeyboard, finishKeyboardMovement } = createCanvasKeyboardMovementHandlers({
    elementsRef: state.elementsRef,
    selectionRef: state.selectionRef,
    keyboardMovementPendingRef: state.keyboardMovementPendingRef,
    duplicateStateRef: state.duplicateStateRef,
    drawKeyboardPreview: () => drawing.renderCanvasFrame(null),
    addHistory,
  });

  const handleTextKeyDown = useCanvasKeyboard({
    actions: {
      cancelInteraction,
      handleCopy: editingHandlers.handleCopy,
      handleDuplicate: editingHandlers.handleDuplicate,
      handlePaste: editingHandlers.handlePaste,
      handleRedo: options.historyHandlers.handleRedo,
      handleUndo: options.historyHandlers.handleUndo,
      finishKeyboardMovement,
      moveSelectedByKeyboard,
      handleLayerOperation: editingHandlers.handleLayerOperation,
      notifyClipboardChange: editingHandlers.notifyClipboardChange,
      onToolSelect,
      handleGroup: editingHandlers.handleGroup,
      handleUngroup: editingHandlers.handleUngroup,
      deleteSelection: editingHandlers.handleDeleteSelection,
      handleLock: editingHandlers.handleLock,
      handleUnlock: editingHandlers.handleUnlock,
    },
    isTextEditorActive: () => Boolean(state.textEditorRef.current),
    cancelText: options.cancelText,
    commitText: options.commitText,
    hasActiveInteraction: () => state.activePointerIdRef.current !== null || Boolean(state.dragRef.current) || Boolean(state.activeStrokeRef.current),
    clearSelection: () => {
      clearKeyboardSelection(state.selectionRef, () => drawing.renderCanvasFrame(null));
    },
  });

  return { handleTextKeyDown };
}
