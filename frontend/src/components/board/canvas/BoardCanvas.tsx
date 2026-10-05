"use client";

import { type ChangeEvent, type MouseEvent, type PointerEvent, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import type { Point, Viewport } from "@/types/geometry";
import type { CanvasSettings, CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { Selection, SelectionSet, Tool } from "@/types/editor";
import { TEXT_FONT_SIZE } from "@/canvas/renderer/renderer";
import { useCanvasViewport } from "@/hooks/useCanvasViewport";
import type { LayerOperation } from "@/editor/layering";
import { ZoomControls } from "@/components/board/canvas/ZoomControls";
import { CollaboratorCursors } from "@/components/board/canvas/CollaboratorCursors";
import { CollaboratorSelections } from "@/components/board/canvas/CollaboratorSelections";
import { setLocalViewport } from "@/collaboration/presenceStore";
import type { SketchFlowDocumentV1 } from "@/document/types";
import type { CanvasSnapshot } from "@/history/types";
import { applyCrop } from "@/editor/cropping";
import { rebaseHistorySnapshots } from "@/history/historyOperations";
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
  onElementCreated?: (element: WhiteboardElement) => void;
  onElementUpdated?: (element: WhiteboardElement) => void;
  onElementDeleted?: (elementId: string) => void;
  onFreehandCreated?: (stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => void;
  onFreehandDeleted?: (stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => void;
  onTextContentUpdated?: (elementId: string, text: string) => void;
  onCursorMove?: (point: Point) => void;
  boardId: string;
  remoteSelectionElements: WhiteboardElement[];
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
  addRemoteElement: (element: WhiteboardElement) => void;
  addRemoteStroke: (stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => void;
  deleteRemoteStroke: (stroke: FreehandStroke, strokeIndex?: number) => void;
  updateRemoteTextContent: (elementId: string, text: string) => void;
  applyRemoteElementUpdate: (element: WhiteboardElement) => void;
  deleteRemoteElement: (elementId: string) => void;
  addImage?: (file: File) => void;
  startCrop: () => void;
  /** Get the current document state for autosave */
  getDocumentState: () => { strokes: FreehandStroke[]; elements: WhiteboardElement[]; groups: Group[]; creationOrder: CreationRecord[] };
  /** Clear the document to start fresh */
  clearDocument: () => void;
};

export const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(
  ({ activeTool, canvasSettings, onToolSelect, onHistoryChange, onClipboardChange, onDocumentChange, onAutosave, onViewportChange, onElementCreated, onElementUpdated, onElementDeleted, onFreehandCreated, onFreehandDeleted, onTextContentUpdated, onCursorMove, boardId, remoteSelectionElements }, ref) => {
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
    onViewportChange: (viewport) => {
      setLocalViewport(viewport);
      onViewportChange?.(viewport);
    },
    drawCanvas,
    renderZoomedViewport: drawing.renderCanvasViewport,
  });
  viewportRefHolder.current = viewportRef;

  const documentHandlers = createBoardCanvasDocumentHandlers({
    state,
    viewport: { fitContentToScreen, resetViewport },
    drawing,
    callbacks: {
      onDocumentChange,
      onElementCreated,
      onElementUpdated,
      onElementDeleted,
      onFreehandCreated,
      onFreehandDeleted,
      onTextContentUpdated,
      onHistoryChange,
      onClipboardChange,
      onAutosave,
    },
  });
  const { addHistory, initializeHistory, handleUndo, handleRedo, handleRestoreDocument, getDocumentState, clearDocument } = documentHandlers;
  const creationOptions = createBoardCanvasCreationOptions({
    state,
    viewportRef,
    toLogicalPoint,
    onToolSelect,
    drawCanvas,
    addHistory,
    onElementCreated,
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
    onElementCreated,
    onTextContentUpdated,
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
    handleDeleteElements,
    handleUpdateProperties,
    handleUpdateTextColor,
  } = editingHandlers;

  const handleSetSelection = createBoardCanvasSelectionHandler(state, drawCanvas);
  const handleExportCanvas = createBoardCanvasExportHandler({ state, canvasSettings });
  const withRemoteHistoryRebase = (
    applyRemoteChange: () => void,
    rebaseSnapshot: (snapshot: CanvasSnapshot) => CanvasSnapshot,
  ) => {
    const localHistory = state.historyRef.current;
    applyRemoteChange();
    if (!localHistory) return;

    // Keep collaborator changes in every timeline snapshot without creating local undo actions.
    const rebasedHistory = rebaseHistorySnapshots(localHistory, rebaseSnapshot);
    state.historyRef.current = rebasedHistory;
    onHistoryChange?.(rebasedHistory.undoStack.length > 1, rebasedHistory.redoStack.length > 0);
  };
  const cloneValue = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
  const addElementToSnapshot = (snapshot: CanvasSnapshot, element: WhiteboardElement) => {
    if (snapshot.elements.some((current) => current.id === element.id)) return snapshot;
    const copy = cloneValue(element);
    snapshot.elements.push(copy);
    snapshot.creationOrder.push({ kind: "element", value: copy });
    return snapshot;
  };
  const addStrokeToSnapshot = (snapshot: CanvasSnapshot, stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => {
    const copy = cloneValue(stroke);
    const index = strokeIndex === undefined ? snapshot.strokes.length : Math.max(0, Math.min(strokeIndex, snapshot.strokes.length));
    const recordIndex = creationOrderIndex === undefined ? snapshot.creationOrder.length : Math.max(0, Math.min(creationOrderIndex, snapshot.creationOrder.length));
    snapshot.strokes.splice(index, 0, copy);
    snapshot.creationOrder.splice(recordIndex, 0, { kind: "stroke", value: copy });
    return snapshot;
  };
  const removeElementFromSnapshot = (snapshot: CanvasSnapshot, elementId: string) => {
    snapshot.elements = snapshot.elements.filter((element) => element.id !== elementId);
    snapshot.creationOrder = snapshot.creationOrder.filter((record) => record.kind !== "element" || record.value.id !== elementId);
    const removedGroupIds = new Set<string>();
    snapshot.groups = snapshot.groups
      .map((group) => {
        const elementIds = group.elementIds.filter((id) => id !== elementId);
        if (elementIds.length < 2) removedGroupIds.add(group.id);
        return { ...group, elementIds };
      })
      .filter((group) => !removedGroupIds.has(group.id));
    snapshot.selection = snapshot.selection.filter((selection) =>
      selection.kind === "element" ? selection.id !== elementId
        : selection.kind === "group" ? !removedGroupIds.has(selection.id)
          : true,
    );
    return snapshot;
  };
  const updateElementInSnapshot = (snapshot: CanvasSnapshot, incomingElement: WhiteboardElement) => {
    const index = snapshot.elements.findIndex((element) => element.id === incomingElement.id);
    if (index < 0 || snapshot.elements[index]?.type !== incomingElement.type) return snapshot;
    const current = snapshot.elements[index]!;
    const updated = current.type === "text" && incomingElement.type === "text"
      ? { ...incomingElement, text: current.text }
      : cloneValue(incomingElement);
    snapshot.elements[index] = updated;
    snapshot.creationOrder.forEach((record) => {
      if (record.kind === "element" && record.value.id === updated.id) record.value = updated;
    });
    return snapshot;
  };
  const updateTextInSnapshot = (snapshot: CanvasSnapshot, elementId: string, text: string) => {
    const element = snapshot.elements.find((candidate) => candidate.id === elementId);
    if (!element || element.type !== "text") return snapshot;
    element.text = text;
    snapshot.creationOrder.forEach((record) => {
      if (record.kind === "element" && record.value.id === elementId && record.value.type === "text") record.value.text = text;
    });
    return snapshot;
  };
  const removeStrokeFromSnapshot = (snapshot: CanvasSnapshot, stroke: FreehandStroke, preferredIndex?: number) => {
    const strokeKey = JSON.stringify(stroke);
    const index = preferredIndex !== undefined
      && JSON.stringify(snapshot.strokes[preferredIndex]) === strokeKey
      ? preferredIndex
      : snapshot.strokes.findIndex((current) => JSON.stringify(current) === strokeKey);
    if (index < 0) return snapshot;
    snapshot.strokes.splice(index, 1);
    let strokeIndex = 0;
    snapshot.creationOrder = snapshot.creationOrder.filter((record) => {
      if (record.kind !== "stroke") return true;
      const keep = strokeIndex !== index;
      strokeIndex += 1;
      return keep;
    });
    snapshot.selection = snapshot.selection
      .filter((selection) => selection.kind !== "stroke" || selection.index !== index)
      .map((selection) => selection.kind === "stroke" && selection.index > index
        ? { ...selection, index: selection.index - 1 }
        : selection);
    return snapshot;
  };

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
    restoreDocument: (doc) => {
      handleRestoreDocument(doc);
      initializeHistory();
      onHistoryChange?.(false, false);
    },
    addRemoteElement: (element) => {
      if (state.elementsRef.current.some((current) => current.id === element.id)) return;

      withRemoteHistoryRebase(() => {
        state.elementsRef.current.push(element);
        state.creationOrderRef.current.push({ kind: "element", value: element });
        drawCanvas();
        addHistory(false);
      }, (snapshot) => addElementToSnapshot(snapshot, element));
    },
    addRemoteStroke: (stroke, strokeIndex, creationOrderIndex) => {
      withRemoteHistoryRebase(() => {
        const index = strokeIndex === undefined ? state.strokesRef.current.length : Math.max(0, Math.min(strokeIndex, state.strokesRef.current.length));
        const recordIndex = creationOrderIndex === undefined ? state.creationOrderRef.current.length : Math.max(0, Math.min(creationOrderIndex, state.creationOrderRef.current.length));
        state.strokesRef.current.splice(index, 0, stroke);
        state.creationOrderRef.current.splice(recordIndex, 0, { kind: "stroke", value: stroke });
        drawCanvas();
        addHistory(false);
      }, (snapshot) => addStrokeToSnapshot(snapshot, stroke, strokeIndex, creationOrderIndex));
    },
    deleteRemoteStroke: (stroke, preferredIndex) => {
      const strokeIndex = preferredIndex !== undefined
        && JSON.stringify(state.strokesRef.current[preferredIndex]) === JSON.stringify(stroke)
        ? preferredIndex
        : state.strokesRef.current.findIndex((current) => JSON.stringify(current) === JSON.stringify(stroke));
      if (strokeIndex < 0) return;
      const currentStroke = state.strokesRef.current[strokeIndex]!;
      withRemoteHistoryRebase(() => {
        state.strokesRef.current.splice(strokeIndex, 1);
        const recordIndex = state.creationOrderRef.current.findIndex((record) => record.kind === "stroke" && record.value === currentStroke);
        if (recordIndex >= 0) state.creationOrderRef.current.splice(recordIndex, 1);
        state.selectionRef.current = state.selectionRef.current.filter((selection) => selection.kind !== "stroke" || selection.value !== currentStroke);
        drawCanvas();
        addHistory(false);
      }, (snapshot) => removeStrokeFromSnapshot(snapshot, stroke, preferredIndex));
    },
    updateRemoteTextContent: (elementId, text) => {
      const element = state.elementsRef.current.find((candidate) => candidate.id === elementId);
      if (!element || element.type !== "text" || element.text === text) return;

      withRemoteHistoryRebase(() => {
        element.text = text;
        drawCanvas();
        addHistory(false);
      }, (snapshot) => updateTextInSnapshot(snapshot, elementId, text));
    },
    applyRemoteElementUpdate: (element) => {
      const current = state.elementsRef.current.find((candidate) => candidate.id === element.id);
      if (!current || current.type !== element.type) return;

      const incomingElement = current.type === "text" && element.type === "text"
        ? { ...element, text: current.text }
        : element;
      if (JSON.stringify(current) === JSON.stringify(incomingElement)) return;

      const currentRecord = current as unknown as Record<string, unknown>;
      for (const key of Object.keys(currentRecord)) {
        if (!(key in incomingElement)) delete currentRecord[key];
      }
      withRemoteHistoryRebase(() => {
        Object.assign(current, incomingElement);
        drawCanvas();
        addHistory(false);
      }, (snapshot) => updateElementInSnapshot(snapshot, element));
    },
    deleteRemoteElement: (elementId) => {
      if (!state.elementsRef.current.some((element) => element.id === elementId)) return;
      withRemoteHistoryRebase(() => handleDeleteElements([elementId]), (snapshot) => removeElementFromSnapshot(snapshot, elementId));
    },
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
  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const previousViewport = viewportRef.current;
    pointerMove(event);
    const currentViewport = viewportRef.current;
    if (currentViewport !== previousViewport) onViewportChange?.(currentViewport);
    onCursorMove?.(toLogicalPoint(getPoint(event)));
  };
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
      <CollaboratorCursors />
      <CollaboratorSelections boardId={boardId} elements={remoteSelectionElements} />
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
