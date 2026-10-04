"use client";

import { type ChangeEvent, type MouseEvent, type PointerEvent, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { Point, Viewport } from "@/types/geometry";
import type { CanvasSettings, CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { Selection, SelectionSet, Tool } from "@/types/editor";
import { TEXT_FONT_SIZE } from "@/canvas/renderer/renderer";
import { useCanvasViewport } from "@/hooks/useCanvasViewport";
import type { LayerOperation } from "@/editor/layering";
import { ZoomControls } from "@/components/board/canvas/ZoomControls";
import type { SketchFlowDocumentV1 } from "@/document/types";
import { applyCrop } from "@/editor/cropping";
import { useBoardCanvasState } from "@/components/board/canvas/state";
import { useBoardCanvasDrawing } from "@/components/board/canvas/drawing";
import {
  createBoardCanvasCreationOptions,
  createBoardCanvasDocumentHandlers,
  createBoardCanvasEditingHandlers,
  createBoardCanvasExportHandler,
  createBoardCanvasImageInsertionHandler,
  createBoardCanvasPointerHandlers,
  createBoardCanvasSelectionHandler,
} from "@/components/board/canvas/handlers/handlers";
import { useBoardCanvasKeyboard } from "@/components/board/canvas/keyboard";
import { CropControls } from "@/components/board/canvas/crop/CropControls";
import {
  cancelText,
  commitText,
  handleCanvasClick as createTextEditor,
  handleTextChange as updateTextEditor,
} from "@/components/board/canvas/creation";

type BoardCanvasProps = {
  activeTool: Tool;
  canvasSettings: CanvasSettings;
  onToolSelect: (tool: Tool) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onClipboardChange?: (canCopy: boolean, canPaste: boolean, canDuplicate: boolean) => void;
  onDocumentChange?: (records: CreationRecord[], groups: Group[], selections: SelectionSet) => void;
  onAutosave?: () => void;
  onViewportChange?: (viewport: Viewport) => void;
};

export type BoardCanvasHandle = {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  deleteSelection: () => void;
  setSelection: (selections: SelectionSet) => void;
  updateProperties: (updates: Partial<WhiteboardElement>, commitHistory?: boolean) => void;
  updateTextColor: (color: string) => void;
  applyLayerOperation: (operation: LayerOperation) => void;
  group: () => void;
  ungroup: () => void;
  lock: () => void;
  unlock: () => void;
  toggleLock: (target?: Selection) => void;
  /** Export the full document as PNG or SVG and trigger a browser download. */
  exportCanvas: (format: "png" | "svg" | "sketchflow", backgroundColor: string, boardName?: string) => void;
  restoreDocument: (doc: SketchFlowDocumentV1) => void;
  addImage?: (file: File) => void;
  startCrop: () => void;
  /** Get the current document state for autosave */
  getDocumentState: () => { strokes: FreehandStroke[]; elements: WhiteboardElement[]; groups: Group[]; creationOrder: CreationRecord[] };
  /** Clear the document to start fresh */
  clearDocument: () => void;
};

export const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(
  ({ activeTool, canvasSettings, onToolSelect, onHistoryChange, onClipboardChange, onDocumentChange, onAutosave, onViewportChange }, ref) => {
  const state = useBoardCanvasState(activeTool);
  const { canvasRef, textInputRef, textEditor, cropRef, isCropping, setIsCropping } = state;
  const viewportRefHolder = useRef<{ current: Viewport } | null>(null);
  const drawing = useBoardCanvasDrawing({
    canvasRef: state.canvasRef,
    strokesRef: state.strokesRef,
    elementsRef: state.elementsRef,
    selectionRef: state.selectionRef,
    canvasSettings,
    activeRectangleRef: state.activeRectangleRef,
    activeCircleRef: state.activeCircleRef,
    activeArrowRef: state.activeArrowRef,
    activeLineRef: state.activeLineRef,
    activeRoundedRectangleRef: state.activeRoundedRectangleRef,
    marqueeRef: state.marqueeRef,
    cropRef: state.cropRef,
    alignmentGuidesRef: state.alignmentGuidesRef,
    toolbarSelectionSignatureRef: state.toolbarSelectionSignatureRef,
    groupsRef: state.groupsRef,
    creationOrderRef: state.creationOrderRef,
    onDocumentChange,
    viewportRefRef: viewportRefHolder,
  });
  const { drawCanvas } = drawing;

  const {
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
  } = useCanvasViewport({
    canvasRef,
    onViewportChange,
    drawCanvas,
    renderZoomedViewport: drawing.renderCanvasViewport,
  });
  viewportRefHolder.current = viewportRef;

  const documentHandlers = createBoardCanvasDocumentHandlers({
    state,
    viewport: { fitContentToScreen, resetViewport },
    drawing,
    callbacks: { onDocumentChange, onHistoryChange, onClipboardChange, onAutosave },
  });
  const { addHistory, initializeHistory, handleUndo, handleRedo, handleRestoreDocument, getDocumentState, clearDocument } = documentHandlers;
  const creationOptions = createBoardCanvasCreationOptions({
    state,
    viewportRef,
    toLogicalPoint,
    onToolSelect,
    drawCanvas,
    addHistory,
  });

  useEffect(() => {
    initializeHistory();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw canvas when canvasSettings changes (e.g., background color from theme)
  useEffect(() => {
    if (canvasRef.current) drawing.renderCanvasFrame();
  // Preserve the existing redraw triggers; drawing reads the current render's settings and refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSettings, viewportRef]);

  const editingHandlers = createBoardCanvasEditingHandlers({
    state,
    drawCanvas,
    addHistory,
    onClipboardChange,
  });
  const {
    handleLock,
    handleUnlock,
    handleToggleLock,
    handleGroup,
    handleUngroup,
    handleLayerOperation,
    handleCopy,
    handlePaste,
    handleDuplicate,
    handleDeleteSelection,
    handleUpdateProperties,
    handleUpdateTextColor,
  } = editingHandlers;

  const handleSetSelection = createBoardCanvasSelectionHandler(state, drawCanvas);
  const handleExportCanvas = createBoardCanvasExportHandler({ state, canvasSettings });

  useImperativeHandle(ref, () => ({
    undo: handleUndo,
    redo: handleRedo,
    copy: handleCopy,
    paste: handlePaste,
    duplicate: handleDuplicate,
    deleteSelection: handleDeleteSelection,
    setSelection: handleSetSelection,
    updateProperties: handleUpdateProperties,
    updateTextColor: handleUpdateTextColor,
    applyLayerOperation: handleLayerOperation,
    group: handleGroup,
    ungroup: handleUngroup,
    lock: handleLock,
    unlock: handleUnlock,
    toggleLock: handleToggleLock,
    exportCanvas: handleExportCanvas,
    restoreDocument: handleRestoreDocument,
    getDocumentState,
    clearDocument,
    startCrop: () => {
      const sel = state.selectionRef.current[0];
      if (state.selectionRef.current.length === 1 && sel.kind === "element" && sel.value.type === "image" && !sel.value.locked) {
        state.cropRef.current = {
          element: sel.value,
          left: 0,
          top: 0,
          right: sel.value.width,
          bottom: sel.value.height
        };
        setIsCropping(true);
        drawCanvas();
      }
    },
    addImage: createBoardCanvasImageInsertionHandler({ creationOptions }),
  }));

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const bounds = canvas.parentElement?.getBoundingClientRect();
      const context = canvas.getContext("2d");

      if (!context || !bounds || bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = bounds.width * devicePixelRatio;
      canvas.height = bounds.height * devicePixelRatio;
      context.scale(devicePixelRatio, devicePixelRatio);
      drawCanvas();
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPoint = (
    event: PointerEvent<HTMLCanvasElement> | MouseEvent<HTMLCanvasElement>,
  ): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();

    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  useEffect(() => {
    if (textEditor) {
      textInputRef.current?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textEditor]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => pointerDown(event);

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) =>
    createTextEditor(event, activeTool, (target) => getPoint(target as MouseEvent<HTMLCanvasElement>), creationOptions);

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => updateTextEditor(event, creationOptions);
  const cancelTextEditor = () => cancelText(creationOptions);
  const commitTextEditor = () => commitText(creationOptions);

  const keyboard = useBoardCanvasKeyboard({
    state,
    drawing,
    pan: { restorePan, finishPan },
    editingHandlers,
    historyHandlers: { handleUndo, handleRedo },
    addHistory,
    onToolSelect,
    cancelText: cancelTextEditor,
    commitText: commitTextEditor,
  });
  const { handleTextKeyDown } = keyboard;

  const pointerHandlers = createBoardCanvasPointerHandlers({
    activeTool,
    state,
    viewportRef,
    viewport: { toLogicalPoint, beginPan, updatePan, hasPan, finishPan },
    canvasSettings,
    drawing,
    getPoint,
    creationOptions,
    addHistory,
    onToolSelect,
  });
  const { pointerDown, pointerMove, pointerUp } = pointerHandlers;
  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => pointerMove(event);
  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => pointerUp(event);
  const handlePointerLeave = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== "select") stopDrawing(event);
  };
  const handleCancelCrop = () => {
    cropRef.current = null;
    setIsCropping(false);
    drawCanvas();
  };
  const handleApplyCrop = async () => {
    if (cropRef.current) {
      const croppedElement = await applyCrop(cropRef.current);
      const index = state.elementsRef.current.findIndex(element => element.id === croppedElement.id);
      if (index !== -1) {
        state.elementsRef.current[index] = croppedElement;
      }
      cropRef.current = null;
      setIsCropping(false);
      drawCanvas();
      addHistory();
    }
  };

  return (
    <section
      aria-label="Whiteboard canvas"
      className="board-canvas relative min-h-0 flex-1 overflow-hidden bg-[#f8fafc]"
    >
      <canvas
        ref={canvasRef}
        aria-label="SketchFlow drawing surface"
        className="absolute inset-0 size-full bg-white/80"
        onClick={handleCanvasClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrawing}
        onPointerCancel={stopDrawing}
        onPointerLeave={handlePointerLeave}
      />
      <ZoomControls
        zoom={zoom}
        onZoomIn={() => zoomFromCenter(viewportRef.current.scale + 0.1)}
        onZoomOut={() => zoomFromCenter(viewportRef.current.scale - 0.1)}
        onReset={() => zoomFromCenter(1)}
      />
      {textEditor && (
        <input
          ref={textInputRef}
          type="text"
          value={textEditor.value}
          aria-label="Enter text"
          autoComplete="off"
          onChange={handleTextChange}
          onKeyDown={handleTextKeyDown}
          onBlur={commitTextEditor}
          className="absolute z-20 rounded-lg border border-teal-300 bg-white/95 px-2 py-1 text-base text-slate-900 shadow-sm outline-none ring-2 ring-teal-100 placeholder:text-slate-400"
          placeholder="Type here"
          style={{
            left: textEditor.x,
            top: Math.max(4, textEditor.y - TEXT_FONT_SIZE * zoom),
            width: 200 * zoom,
            fontSize: TEXT_FONT_SIZE * zoom,
          }}
        />
      )}
      {isCropping && (
        <CropControls onCancel={handleCancelCrop} onApply={handleApplyCrop} />
      )}
    </section>
  );
});

BoardCanvas.displayName = "BoardCanvas";
