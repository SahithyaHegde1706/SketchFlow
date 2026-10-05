import type { CanvasSettings, CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { Point, Viewport } from "@/types/geometry";
import type { SelectionSet, Tool } from "@/types/editor";
import type { BoardCanvasState } from "../state";
import type { CanvasCreationOptions } from "../creation";
import { createCanvasDocumentHandlers } from "../documentHandlers";
import { createCanvasEditingHandlers } from "../editing";
import { handleExportCanvas as exportCanvasOperation } from "../export";
import {
  createImageInsertionHandler,
} from "../creation";
import type { PointerEvent } from "react";
import {
  createCanvasEraserHandler,
  createCanvasPointerDownHandler,
  createCanvasPointerMoveHandler,
  createCanvasPointerUpHandler,
} from "../interaction";
import { setSelection } from "../selection";
import type { useCanvasViewport } from "@/hooks/useCanvasViewport";
import type { useBoardCanvasDrawing } from "../drawing";

type Ref<T> = { current: T };
type ViewportControls = ReturnType<typeof useCanvasViewport>;
type DrawingControls = ReturnType<typeof useBoardCanvasDrawing>;

export function createBoardCanvasCreationOptions(options: {
  state: BoardCanvasState;
  viewportRef: Ref<Viewport>;
  toLogicalPoint: (point: Point) => Point;
  onToolSelect: (tool: Tool) => void;
  drawCanvas: () => void;
  addHistory: () => void;
  onElementCreated?: (element: WhiteboardElement) => void;
}): CanvasCreationOptions {
  const { state } = options;
  return {
    strokesRef: state.strokesRef,
    elementsRef: state.elementsRef,
    creationOrderRef: state.creationOrderRef,
    selectionRef: state.selectionRef,
    activeStrokeRef: state.activeStrokeRef,
    activeRectangleRef: state.activeRectangleRef,
    activeRectangleStartRef: state.activeRectangleStartRef,
    activeCircleRef: state.activeCircleRef,
    activeCircleStartRef: state.activeCircleStartRef,
    activeArrowRef: state.activeArrowRef,
    activeArrowStartRef: state.activeArrowStartRef,
    activeLineRef: state.activeLineRef,
    activeLineStartRef: state.activeLineStartRef,
    activeRoundedRectangleRef: state.activeRoundedRectangleRef,
    activeRoundedRectangleStartRef: state.activeRoundedRectangleStartRef,
    textEditorRef: state.textEditorRef,
    duplicateStateRef: state.duplicateStateRef,
    viewportRef: options.viewportRef,
    setTextEditor: state.setTextEditor,
    toLogicalPoint: options.toLogicalPoint,
    onToolSelect: options.onToolSelect,
    drawCanvas: options.drawCanvas,
    addHistory: options.addHistory,
    onElementCreated: options.onElementCreated,
  };
}

export function createBoardCanvasDocumentHandlers(options: {
  state: BoardCanvasState;
  viewport: Pick<ViewportControls, "fitContentToScreen" | "resetViewport">;
  drawing: Pick<DrawingControls, "drawCanvas" | "renderCanvasViewport">;
  callbacks: {
    onDocumentChange?: (records: CreationRecord[], groups: Group[], selections: SelectionSet) => void;
    onElementCreated?: (element: WhiteboardElement) => void;
    onElementUpdated?: (element: WhiteboardElement) => void;
    onElementDeleted?: (elementId: string) => void;
    onFreehandCreated?: (stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => void;
    onFreehandDeleted?: (stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => void;
    onTextContentUpdated?: (elementId: string, text: string) => void;
    onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
    onClipboardChange?: (canCopy: boolean, canPaste: boolean, canDuplicate: boolean) => void;
    onAutosave?: () => void;
  };
}) {
  const { state, viewport, drawing, callbacks } = options;
  return createCanvasDocumentHandlers({
    canvasRef: state.canvasRef,
    strokesRef: state.strokesRef,
    elementsRef: state.elementsRef,
    groupsRef: state.groupsRef,
    creationOrderRef: state.creationOrderRef,
    selectionRef: state.selectionRef,
    historyRef: state.historyRef,
    dragRef: state.dragRef,
    multiDragRef: state.multiDragRef,
    rotationRef: state.rotationRef,
    activeStrokeRef: state.activeStrokeRef,
    duplicateStateRef: state.duplicateStateRef,
    clipboardRef: state.clipboardRef,
    activeRectangleRef: state.activeRectangleRef,
    activeRectangleStartRef: state.activeRectangleStartRef,
    activeCircleRef: state.activeCircleRef,
    activeCircleStartRef: state.activeCircleStartRef,
    activeArrowRef: state.activeArrowRef,
    activeArrowStartRef: state.activeArrowStartRef,
    activeLineRef: state.activeLineRef,
    activeLineStartRef: state.activeLineStartRef,
    activeRoundedRectangleRef: state.activeRoundedRectangleRef,
    activeRoundedRectangleStartRef: state.activeRoundedRectangleStartRef,
    marqueeRef: state.marqueeRef,
    cropRef: state.cropRef,
    alignmentGuidesRef: state.alignmentGuidesRef,
    setTextEditor: state.setTextEditor,
    setIsCropping: state.setIsCropping,
    fitContentToScreen: viewport.fitContentToScreen,
    resetViewport: viewport.resetViewport,
    drawCanvas: drawing.drawCanvas,
    renderCanvasViewport: () => drawing.renderCanvasViewport(),
    ...callbacks,
  });
}

export function createBoardCanvasEditingHandlers(options: {
  state: BoardCanvasState;
  drawCanvas: () => void;
  addHistory: (emitCollaborationEvents?: boolean) => void;
  onElementCreated?: (element: WhiteboardElement) => void;
  onTextContentUpdated?: (elementId: string, text: string) => void;
  onClipboardChange?: (canCopy: boolean, canPaste: boolean, canDuplicate: boolean) => void;
}) {
  const { state } = options;
  return createCanvasEditingHandlers({
    strokesRef: state.strokesRef,
    elementsRef: state.elementsRef,
    groupsRef: state.groupsRef,
    creationOrderRef: state.creationOrderRef,
    selectionRef: state.selectionRef,
    clipboardRef: state.clipboardRef,
    duplicateStateRef: state.duplicateStateRef,
    drawCanvas: options.drawCanvas,
    addHistory: options.addHistory,
    onElementCreated: options.onElementCreated,
    onTextContentUpdated: options.onTextContentUpdated,
    onClipboardChange: options.onClipboardChange,
  });
}

export function createBoardCanvasSelectionHandler(
  state: Pick<BoardCanvasState, "selectionRef" | "duplicateStateRef">,
  drawCanvas: () => void,
) {
  return (selections: SelectionSet) => {
    setSelection(state.selectionRef, selections, state.duplicateStateRef, drawCanvas);
  };
}

export function createBoardCanvasExportHandler(options: {
  state: Pick<BoardCanvasState, "strokesRef" | "elementsRef" | "groupsRef" | "creationOrderRef">;
  canvasSettings: CanvasSettings;
}) {
  return (format: "png" | "svg" | "sketchflow", backgroundColor: string, boardName?: string) => {
    exportCanvasOperation(
      format,
      backgroundColor,
      boardName,
      options.state.strokesRef.current,
      options.state.elementsRef.current,
      options.state.groupsRef.current,
      options.state.creationOrderRef.current,
      options.canvasSettings,
    );
  };
}

export function createBoardCanvasImageInsertionHandler(options: {
  creationOptions: CanvasCreationOptions;
}) {
  return createImageInsertionHandler(options.creationOptions);
}

export function createBoardCanvasPointerHandlers(options: {
  activeTool: Tool;
  state: BoardCanvasState;
  viewportRef: Ref<Viewport>;
  viewport: Pick<ViewportControls, "toLogicalPoint" | "beginPan" | "updatePan" | "hasPan" | "finishPan">;
  canvasSettings: CanvasSettings;
  drawing: Pick<DrawingControls, "drawCanvas" | "renderCanvasFrame" | "renderCanvasViewport" | "handleImageLoaded">;
  getPoint: (event: PointerEvent<HTMLCanvasElement>) => Point;
  creationOptions: CanvasCreationOptions;
  addHistory: () => void;
  onToolSelect: (tool: Tool) => void;
}) {
  const { activeTool, state, viewportRef, viewport, canvasSettings, drawing, getPoint, creationOptions, addHistory, onToolSelect } = options;
  const eraseAtPoint = createCanvasEraserHandler({
    canvasRef: state.canvasRef,
    creationOrderRef: state.creationOrderRef,
    strokesRef: state.strokesRef,
    elementsRef: state.elementsRef,
    groupsRef: state.groupsRef,
    selectionRef: state.selectionRef,
    duplicateStateRef: state.duplicateStateRef,
    viewportRef,
    canvasSettings,
    handleImageLoaded: drawing.handleImageLoaded,
    addHistory,
    renderCanvas: () => drawing.renderCanvasFrame(null),
  });
  const pointerMove = createCanvasPointerMoveHandler({
    activeTool,
    canvasRef: state.canvasRef,
    viewportRef,
    canvasSettings,
    activePointerIdRef: state.activePointerIdRef,
    cropRef: state.cropRef,
    activeStrokeRef: state.activeStrokeRef,
    strokesRef: state.strokesRef,
    elementsRef: state.elementsRef,
    groupsRef: state.groupsRef,
    creationOrderRef: state.creationOrderRef,
    selectionRef: state.selectionRef,
    dragRef: state.dragRef,
    multiDragRef: state.multiDragRef,
    rotationRef: state.rotationRef,
    marqueeRef: state.marqueeRef,
    preMarqueeSelectionRef: state.preMarqueeSelectionRef,
    marqueeShiftRef: state.marqueeShiftRef,
    alignmentGuidesRef: state.alignmentGuidesRef,
    getPoint,
    toLogicalPoint: viewport.toLogicalPoint,
    updatePan: viewport.updatePan,
    hasPan: viewport.hasPan,
    drawCanvas: drawing.drawCanvas,
    renderPreview: () => drawing.renderCanvasFrame(),
    renderNoPreview: () => drawing.renderCanvasFrame(null),
    creationOptions,
  });
  const pointerUp = createCanvasPointerUpHandler({
    activeTool,
    canvasRef: state.canvasRef,
    viewportRef,
    activePointerIdRef: state.activePointerIdRef,
    cropRef: state.cropRef,
    dragRef: state.dragRef,
    multiDragRef: state.multiDragRef,
    rotationRef: state.rotationRef,
    marqueeRef: state.marqueeRef,
    preMarqueeSelectionRef: state.preMarqueeSelectionRef,
    marqueeShiftRef: state.marqueeShiftRef,
    alignmentGuidesRef: state.alignmentGuidesRef,
    duplicateStateRef: state.duplicateStateRef,
    selectionRef: state.selectionRef,
    elementsRef: state.elementsRef,
    groupsRef: state.groupsRef,
    creationOrderRef: state.creationOrderRef,
    getPoint,
    toLogicalPoint: viewport.toLogicalPoint,
    finishPan: viewport.finishPan,
    drawCanvas: drawing.drawCanvas,
    renderNoPreview: () => drawing.renderCanvasFrame(null),
    addHistory,
    onToolSelect,
    creationOptions,
  });
  const pointerDown = createCanvasPointerDownHandler({
    activeTool,
    canvasRef: state.canvasRef,
    viewportRef,
    cropRef: state.cropRef,
    activePointerIdRef: state.activePointerIdRef,
    selectionRef: state.selectionRef,
    creationOrderRef: state.creationOrderRef,
    elementsRef: state.elementsRef,
    dragRef: state.dragRef,
    multiDragRef: state.multiDragRef,
    rotationRef: state.rotationRef,
    preMarqueeSelectionRef: state.preMarqueeSelectionRef,
    marqueeShiftRef: state.marqueeShiftRef,
    marqueeRef: state.marqueeRef,
    duplicateStateRef: state.duplicateStateRef,
    getPoint,
    toLogicalPoint: viewport.toLogicalPoint,
    beginPan: viewport.beginPan,
    drawCanvas: drawing.drawCanvas,
    renderPreview: () => drawing.renderCanvasViewport(),
    eraseAtPoint,
    creationOptions,
  });

  return { pointerDown, pointerMove, pointerUp };
}
