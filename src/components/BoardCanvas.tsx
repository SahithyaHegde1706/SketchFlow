"use client";

import { createLine, createRoundedRectangle } from "@/editor/tools";
import type { ChangeEvent, KeyboardEvent, MouseEvent, PointerEvent } from "react";
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import type {
  AlignmentGuide,
  ArrowElement,
  LineElement,
  RoundedRectangleElement,
  CanvasSettings,
  CircleElement,
  CreationRecord,
  DragState,
  FreehandStroke,
  MultiDragState,
  PanState,
  Point,
  RectangleElement,
  RotationState,
  Group,
  ResizeHandle,
  Selection,
  SelectionSet,
  TextElement,
  MarqueeState,
  TextEditorState,
  Tool,
  Viewport,
  WhiteboardElement,
  AlignOperation,
} from "@/types/canvas";
import { calculateSnap } from "@/editor/snapping";
import { exportToPng } from "@/export/png";
import { exportToSvg } from "@/export/svg";
import { STROKE_COLOR, TEXT_FONT_SIZE, renderCanvas } from "@/canvas/renderer";
import { findSelectionAtPoint, isPointOnElement, isPointOnStroke } from "@/canvas/hit-testing";
import { findResizeHandleAtPoint, getCombinedSelectionBounds, getSelectionBounds } from "@/canvas/selection";
import { screenToLogical, zoomViewport } from "@/canvas/geometry";
import { shouldSamplePoint } from "@/canvas/freehand";
import { normalizeMarqueeBounds, getMarqueeSelections, MIN_MARQUEE_DISTANCE, unionSelections } from "@/editor/marquee";
import { renderMarquee } from "@/canvas/renderer";
import { removeByReference } from "@/editor/deletion";
import { cloneSelectionValue, createArrow, createCircle, createRectangle } from "@/editor/tools";
import { getToolForShortcut, hasShortcutModifier, isTextEditingTarget } from "@/editor/shortcuts";
import { moveSelection } from "@/editor/movement";
import { resizeSelection } from "@/editor/resizing";
import { applyRotation } from "@/editor/rotation";
import { applyLayerOperation, getLayerAvailability } from "@/editor/layering";
import type { LayerAvailability, LayerOperation } from "@/editor/layering";
import { ZoomControls } from "@/components/ZoomControls";
import {
  canRedo,
  canUndo,
  createHistory,
  createSelectionSnapshot,
  createSnapshot,
  record,
  redo,
  undo,
} from "@/history/history";
import type { HistoryState, CanvasSnapshot } from "@/history/types";
import { groupSelection, ungroupSelection, getSelectedGroups, removeElementFromGroups } from "@/editor/grouping";
import {
  copyToClipboard,
  offsetClipboard,
  createDuplicateState,
  resetDuplicateState,
  areSelectionsEqual,
} from "@/clipboard/clipboard";
import type { ClipboardState, DuplicateState } from "@/clipboard/types";
import {
  isItemLocked,
  isAnySelectionLocked,
  getLockAvailability,
  setSelectionLock,
} from "@/editor/locking";

type BoardCanvasProps = {
  activeTool: Tool;
  canvasSettings: CanvasSettings;
  onToolSelect: (tool: Tool) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onClipboardChange?: (canCopy: boolean, canPaste: boolean, canDuplicate: boolean) => void;
  onLayerChange?: (availability: LayerAvailability) => void;
  onGroupAvailabilityChange?: (canGroup: boolean, canUngroup: boolean) => void;
  onAlignAvailabilityChange?: (canAlign: boolean, canDistribute: boolean) => void;
  onLockAvailabilityChange?: (canLock: boolean, canUnlock: boolean) => void;
  onDocumentChange?: (records: CreationRecord[], groups: Group[], selections: SelectionSet) => void;
};

export type BoardCanvasHandle = {
  undo: () => void;
  redo: () => void;
  copy: () => void;
  paste: () => void;
  duplicate: () => void;
  deleteSelection: () => void;
  setSelection: (selections: SelectionSet) => void;
  updateProperties: (updates: Partial<WhiteboardElement>) => void;
  applyLayerOperation: (operation: LayerOperation) => void;
  group: () => void;
  ungroup: () => void;
  align: (operation: AlignOperation) => void;
  lock: () => void;
  unlock: () => void;
  toggleLock: (target?: Selection) => void;
  /** Export the full document as PNG or SVG and trigger a browser download. */
  exportCanvas: (format: "png" | "svg", backgroundColor: string) => void;
};

export const BoardCanvas = forwardRef<BoardCanvasHandle, BoardCanvasProps>(
  ({ activeTool, canvasSettings, onToolSelect, onHistoryChange, onClipboardChange, onLayerChange, onGroupAvailabilityChange, onAlignAvailabilityChange, onLockAvailabilityChange, onDocumentChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<FreehandStroke[]>([]);
  const elementsRef = useRef<WhiteboardElement[]>([]);
  const groupsRef = useRef<Group[]>([]);
  const creationOrderRef = useRef<CreationRecord[]>([]);
  const selectionRef = useRef<SelectionSet>([]);
  const dragRef = useRef<DragState | null>(null);
  const multiDragRef = useRef<MultiDragState | null>(null);
  const rotationRef = useRef<RotationState | null>(null);
  const viewportRef = useRef<Viewport>({ offsetX: 0, offsetY: 0, scale: 1 });
  const panRef = useRef<PanState | null>(null);
  const activeStrokeRef = useRef<FreehandStroke | null>(null);
  const clipboardRef = useRef<ClipboardState>({ item: null });
  const duplicateStateRef = useRef<DuplicateState>(createDuplicateState());
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
  const [zoom, setZoom] = useState(1);
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
  activeToolRef.current = activeTool;

  const drawCanvas = () => {
    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      [activeRectangleRef.current, activeCircleRef.current, activeArrowRef.current, activeLineRef.current, activeRoundedRectangleRef.current].find(Boolean) || null,
      selectionRef.current,
      viewportRef.current,
      canvasSettings,
      alignmentGuidesRef.current,
    );
    if (marqueeRef.current && canvasRef.current) {
      renderMarquee(canvasRef.current, normalizeMarqueeBounds(marqueeRef.current), viewportRef.current);
    }
  };

  const addHistory = () => {
    if (!historyRef.current) return;
    historyRef.current = record(
      historyRef.current,
      createSnapshot(strokesRef.current, elementsRef.current, creationOrderRef.current, selectionRef.current, groupsRef.current)
    );
    onHistoryChange?.(canUndo(historyRef.current), canRedo(historyRef.current));
  };

  const selectionIncludes = (selections: SelectionSet, candidate: Selection) =>
    selections.some(selection => selection.kind === candidate.kind && (
      selection.value === candidate.value ||
      (selection.kind === "element" && candidate.kind === "element" && selection.value.id === candidate.value.id) ||
      (selection.kind === "group" && candidate.kind === "group" && selection.value.id === candidate.value.id)
    ));

  const flattenSelection = (selections: SelectionSet): SelectionSet => {
    const flat: SelectionSet = [];
    for (const selection of selections) {
      if (selection.kind === "group") {
        for (const id of selection.value.elementIds) {
          const element = elementsRef.current.find((e) => e.id === id);
          if (element && !flat.some((f) => f.kind === "element" && f.value.id === id)) {
            flat.push({ kind: "element", value: element });
          }
        }
      } else {
        flat.push(selection);
      }
    }
    return flat;
  };

  useEffect(() => {
    historyRef.current = createHistory(
      createSnapshot(strokesRef.current, elementsRef.current, creationOrderRef.current, [], groupsRef.current)
    );
  }, []);

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

    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      [activeRectangleRef.current, activeCircleRef.current, activeArrowRef.current, activeLineRef.current, activeRoundedRectangleRef.current].find(Boolean) || null,
      selectionRef.current,
      viewportRef.current,
      canvasSettings,
    );
    notifyLayerChange();
  };

  const handleUndo = () => {
    if (!historyRef.current) return;
    const { newHistory, snapshot } = undo(historyRef.current);
    if (snapshot) {
      historyRef.current = newHistory;
      applySnapshot(snapshot);
      resetDuplicateState(duplicateStateRef.current);
      onHistoryChange?.(canUndo(newHistory), canRedo(newHistory));
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
    }
  };

  const notifyClipboardChange = () => {
    onClipboardChange?.(
      selectionRef.current.length > 0, // canCopy
      !!clipboardRef.current.item, // canPaste
      selectionRef.current.length > 0, // canDuplicate
    );
  };

  const notifyLayerChange = () => {
    if (historyRef.current) {
      const lastSnapshot = historyRef.current.undoStack[historyRef.current.undoStack.length - 1];
      if (lastSnapshot) {
        historyRef.current = {
          ...historyRef.current,
          undoStack: [
            ...historyRef.current.undoStack.slice(0, -1),
            { ...lastSnapshot, selection: createSelectionSnapshot(strokesRef.current, selectionRef.current) },
          ],
        };
      }
      }
      onLayerChange?.(getLayerAvailability(creationOrderRef.current, selectionRef.current));
      notifyGroupAvailabilityChange();
      onDocumentChange?.([...creationOrderRef.current], [...groupsRef.current], [...selectionRef.current]);
    };

  const notifyGroupAvailabilityChange = () => {
    const elementIds = selectionRef.current
      .filter((item): item is Extract<Selection, { kind: "element" }> => item.kind === "element")
      .map(item => item.value.id)
      .filter((id, index, ids) => ids.indexOf(id) === index);
    
    const canGroup = elementIds.length >= 2 && !elementIds.some(id => groupsRef.current.some(g => g.elementIds.includes(id)));
    const canUngroup = getSelectedGroups(selectionRef.current).length > 0;
    
    onGroupAvailabilityChange?.(canGroup, canUngroup);
    onAlignAvailabilityChange?.(selectionRef.current.length >= 2, selectionRef.current.length >= 3);

    const { canLock, canUnlock } = getLockAvailability(selectionRef.current, elementsRef.current);
    onLockAvailabilityChange?.(canLock, canUnlock);
  };

  const handleLock = () => {
    if (setSelectionLock(selectionRef.current, elementsRef.current, true)) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
      notifyLayerChange();
    }
  };

  const handleUnlock = () => {
    if (setSelectionLock(selectionRef.current, elementsRef.current, false)) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
      notifyLayerChange();
    }
  };

  const handleToggleLock = (target?: Selection) => {
    const targets = target ? [target] : selectionRef.current;
    const isLocked = isAnySelectionLocked(targets, elementsRef.current);
    if (setSelectionLock(targets, elementsRef.current, !isLocked)) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
      notifyLayerChange();
    }
  };

  const handleGroup = () => {
    const group = groupSelection(selectionRef.current, elementsRef.current, groupsRef.current);
    if (group) {
      selectionRef.current = [{ kind: "group", value: group }];
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
      notifyLayerChange();
    }
  };

  const handleUngroup = () => {
    const ungroupedIds = ungroupSelection(selectionRef.current, groupsRef.current);
    if (ungroupedIds.length > 0) {
      selectionRef.current = ungroupedIds
        .map(id => elementsRef.current.find(e => e.id === id))
        .filter((e): e is WhiteboardElement => !!e)
        .map(element => ({ kind: "element", value: element }));
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
      notifyLayerChange();
    }
  };

  const handleLayerOperation = (operation: LayerOperation) => {
    if (!applyLayerOperation(creationOrderRef.current, selectionRef.current, operation)) {
      return;
    }

    drawCanvas();
    addHistory();
    resetDuplicateState(duplicateStateRef.current);
    notifyLayerChange();
  };

  const handleCopy = () => {
    clipboardRef.current = copyToClipboard(selectionRef.current, elementsRef.current, groupsRef.current, creationOrderRef.current);
    resetDuplicateState(duplicateStateRef.current);
    notifyClipboardChange();
  };

  const handlePaste = () => {
    if (!clipboardRef.current.item) return;

    const isContinuing = areSelectionsEqual(duplicateStateRef.current.lastSelectionSnapshot, selectionRef.current);
    if (!isContinuing) {
      duplicateStateRef.current.sequenceCount = 1;
    } else {
      duplicateStateRef.current.sequenceCount += 1;
    }

    const offsetAmount = 20 * duplicateStateRef.current.sequenceCount;
    const { selections, groups, creationRecords } = offsetClipboard(clipboardRef.current.item, offsetAmount);

    for (const record of creationRecords) {
      if (record.kind === "element") {
        elementsRef.current.push(record.value);
        creationOrderRef.current.push({ kind: "element", value: record.value });
      } else if (record.kind === "stroke") {
        strokesRef.current.push(record.value);
        creationOrderRef.current.push({ kind: "stroke", value: record.value });
      }
    }
    for (const group of groups) {
      groupsRef.current.push(group);
    }
    selectionRef.current = selections;
    duplicateStateRef.current.lastSelectionSnapshot = selections;
    
    drawCanvas();
    addHistory();
    notifyClipboardChange();
    notifyLayerChange();
  };

  const handleDuplicate = () => {
    if (selectionRef.current.length === 0) return;
    
    const isContinuing = areSelectionsEqual(duplicateStateRef.current.lastSelectionSnapshot, selectionRef.current);
    if (!isContinuing) {
      duplicateStateRef.current.sequenceCount = 1;
    } else {
      duplicateStateRef.current.sequenceCount += 1;
    }

    const tempClipboard = copyToClipboard(selectionRef.current, elementsRef.current, groupsRef.current, creationOrderRef.current);
    if (!tempClipboard.item) return;
    
    const { selections, groups, creationRecords } = offsetClipboard(tempClipboard.item, 20);

    for (const record of creationRecords) {
      if (record.kind === "element") {
        elementsRef.current.push(record.value);
        creationOrderRef.current.push({ kind: "element", value: record.value });
      } else if (record.kind === "stroke") {
        strokesRef.current.push(record.value);
        creationOrderRef.current.push({ kind: "stroke", value: record.value });
      }
    }
    for (const group of groups) {
      groupsRef.current.push(group);
    }
    selectionRef.current = selections;
    duplicateStateRef.current.lastSelectionSnapshot = selections;
    
    drawCanvas();
    addHistory();
    notifyClipboardChange();
    notifyLayerChange();
  };

  const handleAlign = async (operation: AlignOperation) => {
    if (selectionRef.current.length < 2) return;
    if (isAnySelectionLocked(selectionRef.current, elementsRef.current)) return;

    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    
    const { alignSelection } = await import("@/editor/alignment");
    
    // clone all currently selected objects as originals
    const originals = selectionRef.current.map(selection => cloneSelectionValue(selection));
    
    const moved = alignSelection(context, selectionRef.current, originals, operation, elementsRef.current);
    
    if (moved) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
    }
  };

  const handleSetSelection = (selections: SelectionSet) => {
    selectionRef.current = [...selections];
    resetDuplicateState(duplicateStateRef.current);
    drawCanvas();
    notifyLayerChange();
  };

  const handleDeleteSelection = () => {
    const toDelete = selectionRef.current.filter(sel => !isItemLocked(sel, elementsRef.current));
    if (toDelete.length > 0) {
      for (const selection of toDelete) {
        if (selection.kind === "stroke") {
          removeByReference(strokesRef.current, selection.value);
        } else if (selection.kind === "group") {
          selection.value.elementIds.forEach(id => {
            const element = elementsRef.current.find(e => e.id === id);
            if (element) {
              removeByReference(elementsRef.current, element);
            }
          });
          groupsRef.current = groupsRef.current.filter(g => g.id !== selection.value.id);
        } else {
          removeByReference(elementsRef.current, selection.value);
          removeElementFromGroups(selection.value.id, groupsRef.current);
        }
      }
      creationOrderRef.current = creationOrderRef.current.filter(record => !selectionIncludes(toDelete, record as Selection));
      selectionRef.current = selectionRef.current.filter(sel => isItemLocked(sel, elementsRef.current));
      drawCanvas();
      addHistory();
      notifyLayerChange();
    }
  };

  const handleUpdateProperties = (updates: Partial<WhiteboardElement>) => {
    if (selectionRef.current.length === 0) return;
    if (isAnySelectionLocked(selectionRef.current, elementsRef.current)) return;
    
    const applySafeUpdates = (element: WhiteboardElement, updates: Partial<WhiteboardElement>) => {
      const safeUpdates = { ...updates } as Record<string, unknown>;
      if (element.type !== "rectangle" && element.type !== "circle") {
        delete safeUpdates.fillColor;
      }
      if (element.type !== "text") {
        delete safeUpdates.fontFamily;
        delete safeUpdates.fontWeight;
        delete safeUpdates.fontStyle;
        delete safeUpdates.textDecoration;
        delete safeUpdates.textAlign;
        delete safeUpdates.lineHeight;
        delete safeUpdates.text;
        delete safeUpdates.fontSize;
      }
      Object.assign(element, safeUpdates);
    };

    let changed = false;
    for (const selection of selectionRef.current) {
      if (selection.kind === "element") {
        if (!isItemLocked(selection.value, elementsRef.current)) {
          applySafeUpdates(selection.value, updates);
          changed = true;
        }
      } else if (selection.kind === "group") {
        if (!isItemLocked(selection.value, elementsRef.current)) {
          for (const id of selection.value.elementIds) {
            const element = elementsRef.current.find(e => e.id === id);
            if (element && !element.locked) {
              applySafeUpdates(element, updates);
              changed = true;
            }
          }
        }
      }
    }
    
    if (changed) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
      notifyLayerChange();
    }
  };

  const handleExportCanvas = (format: "png" | "svg", backgroundColor: string) => {
    // Export is a read-only operation; it must NOT modify any editor state.
    const strokes       = strokesRef.current;
    const elements      = elementsRef.current;
    // Pass creationOrderRef so the export reproduces the exact z-order the user
    // sees: layering operations (Bring Forward / Send Backward / etc.) reorder
    // creationOrderRef, not strokesRef / elementsRef, so creationOrderRef is the
    // canonical layer-order source.
    const creationOrder = creationOrderRef.current;
    if (format === "svg") {
      exportToSvg(strokes, elements, backgroundColor, creationOrder);
    } else {
      exportToPng(strokes, elements, backgroundColor, creationOrder);
    }
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
    applyLayerOperation: handleLayerOperation,
    group: handleGroup,
    ungroup: handleUngroup,
    align: handleAlign,
    lock: handleLock,
    unlock: handleUnlock,
    toggleLock: handleToggleLock,
    exportCanvas: handleExportCanvas,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const resizeCanvas = () => {
      const bounds = canvas.getBoundingClientRect();
      const context = canvas.getContext("2d");

      if (!context || bounds.width === 0 || bounds.height === 0) {
        return;
      }

      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = Math.round(bounds.width * devicePixelRatio);
      canvas.height = Math.round(bounds.height * devicePixelRatio);
      renderCanvas(
        canvas,
        strokesRef.current,
        elementsRef.current,
        [activeRectangleRef.current, activeCircleRef.current, activeArrowRef.current, activeLineRef.current, activeRoundedRectangleRef.current].find(Boolean) || null,
        selectionRef.current,
        viewportRef.current, canvasSettings);
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
  }, [textEditor]);

  const applyZoom = (newScale: number, centerX: number, centerY: number) => {
    newScale = Math.min(Math.max(newScale, 0.25), 4);
    if (newScale === viewportRef.current.scale) return;

    viewportRef.current = zoomViewport(viewportRef.current, newScale, centerX, centerY);
    setZoom(newScale);

    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      [activeRectangleRef.current, activeCircleRef.current, activeArrowRef.current, activeLineRef.current, activeRoundedRectangleRef.current].find(Boolean) || null,
      selectionRef.current,
      viewportRef.current,
      canvasSettings,
    );
  };

  const zoomFromCenter = (newScale: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    applyZoom(newScale, rect.width / 2, rect.height / 2);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onNativeWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const delta = event.deltaY > 0 ? -0.1 : 0.1;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        applyZoom(viewportRef.current.scale + delta, x, y);
      }
    };

    canvas.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onNativeWheel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    if (activeTool === "text") {
      return;
    }

    const screenPoint = getPoint(event);

    if (activeTool === "hand") {
      panRef.current = {
        pointerStartX: screenPoint.x,
        pointerStartY: screenPoint.y,
        originOffsetX: viewportRef.current.offsetX,
        originOffsetY: viewportRef.current.offsetY,
      };
      activePointerIdRef.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      event.currentTarget.style.cursor = "grabbing";
      return;
    }

    const point = screenToLogical(screenPoint, viewportRef.current);

    if (activeTool === "select") {
      const currentSelection = selectionRef.current;
      const context = canvasRef.current?.getContext("2d");
      const clickedSelection = context
        ? findSelectionAtPoint(context, point, creationOrderRef.current, true)
        : null;

      let clickedHandle: ResizeHandle | null = null;
      if (currentSelection.length > 0 && context) {
        clickedHandle = findResizeHandleAtPoint(context, point, currentSelection, elementsRef.current);
      }

      if (clickedHandle === "rotate" && currentSelection.length > 0) {
        if (!isAnySelectionLocked(currentSelection, elementsRef.current)) {
          // Find selection bounds center to use as the orbit center
          const bounds = getCombinedSelectionBounds(context!, currentSelection, elementsRef.current);
          const centerX = (bounds.left + bounds.right) / 2;
          const centerY = (bounds.top + bounds.bottom) / 2;
          
          const flatSelections = flattenSelection(currentSelection);
          rotationRef.current = {
            selections: flatSelections,
            originals: flatSelections.map(selection => cloneSelectionValue(selection)),
            originalElements: elementsRef.current.map(e => ({ ...e })),
            centerX,
            centerY,
            initialPointerAngle: Math.atan2(point.y - centerY, point.x - centerX),
            moved: false,
          };
          activePointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      } else if (clickedHandle && currentSelection.length === 1) {
        const selection = currentSelection[0]!;
        if (!isItemLocked(selection, elementsRef.current)) {
          dragRef.current = {
            selection,
            pointerStart: point,
            original: cloneSelectionValue(selection),
            type: "resize",
            handle: clickedHandle,
          };
          activePointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        }
      } else if (event.shiftKey && clickedSelection) {
        selectionRef.current = selectionIncludes(currentSelection, clickedSelection)
          ? currentSelection.filter(selection => !selectionIncludes([selection], clickedSelection))
          : [...currentSelection, clickedSelection];
        resetDuplicateState(duplicateStateRef.current);
        notifyLayerChange();
        dragRef.current = null;
        multiDragRef.current = null;
      } else if (clickedSelection) {
        const wasSelected = selectionIncludes(currentSelection, clickedSelection);
        const activeSelection = wasSelected ? currentSelection : [clickedSelection];
        const flatSelections = flattenSelection(activeSelection);
        const movableSelections = flatSelections.filter(sel => !isItemLocked(sel, elementsRef.current));

        if (!wasSelected) {
          selectionRef.current = [clickedSelection];
          resetDuplicateState(duplicateStateRef.current);
          notifyLayerChange();
        }

        if (movableSelections.length > 0) {
          const context = canvasRef.current?.getContext("2d");
          const originalBounds = context ? getCombinedSelectionBounds(context, movableSelections, elementsRef.current) : undefined;
          multiDragRef.current = {
            selections: movableSelections,
            originals: movableSelections.map(selection => cloneSelectionValue(selection)),
            pointerStart: point,
            clicked: clickedSelection,
            moved: false,
            originalBounds,
          };
          activePointerIdRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
        } else {
          dragRef.current = null;
          multiDragRef.current = null;
        }
      } else {
        // Pointer down on empty canvas space -> initialize marquee drag
        preMarqueeSelectionRef.current = [...currentSelection];
        marqueeShiftRef.current = event.shiftKey;
        marqueeRef.current = {
          startX: point.x,
          startY: point.y,
          currentX: point.x,
          currentY: point.y,
        };
        activePointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = null;
        multiDragRef.current = null;
        resetDuplicateState(duplicateStateRef.current);
      }

      drawCanvas();
      return;
    }

    if (activeTool === "eraser") {
      eraseAtPoint(point);
      return;
    }

    selectionRef.current = [];
    notifyLayerChange();

    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (activeTool === "rectangle") {
      activeRectangleStartRef.current = point;
      activeRectangleRef.current = createRectangle(point, point);
    } else if (activeTool === "circle") {
      activeCircleStartRef.current = point;
      activeCircleRef.current = createCircle(point, point);
    } else if (activeTool === "arrow") {
        activeArrowStartRef.current = point;
        activeArrowRef.current = createArrow(point, point);
      } else if (activeTool === "line") {
        activeLineStartRef.current = point;
        activeLineRef.current = createLine(point, point);
      } else if (activeTool === "roundedRectangle") {
        activeRoundedRectangleStartRef.current = point;
        activeRoundedRectangleRef.current = createRoundedRectangle(point, point);
      } else {
      const stroke = [point];
      activeStrokeRef.current = stroke;
      strokesRef.current.push(stroke);
      creationOrderRef.current.push({ kind: "stroke", value: stroke });
    }

    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      [activeRectangleRef.current, activeCircleRef.current, activeArrowRef.current, activeLineRef.current, activeRoundedRectangleRef.current].find(Boolean) || null,
      selectionRef.current,
      viewportRef.current,
      canvasSettings,
    );
  };

  const handleCanvasClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "text") {
      return;
    }

    const screenPoint = getPoint(event);
    const editor = { x: screenPoint.x, y: screenPoint.y, value: "" };
    textEditorRef.current = editor;
    setTextEditor(editor);
  };

  const handleTextChange = (event: ChangeEvent<HTMLInputElement>) => {
    const editor = textEditorRef.current;

    if (!editor) {
      return;
    }

    const nextEditor = { ...editor, value: event.target.value };
    textEditorRef.current = nextEditor;
    setTextEditor(nextEditor);
  };

  const cancelText = () => {
    textEditorRef.current = null;
    setTextEditor(null);
  };

  const commitText = () => {
    const editor = textEditorRef.current;

    if (!editor) {
      return;
    }

    textEditorRef.current = null;
    setTextEditor(null);

    if (editor.value.trim().length === 0) {
      return;
    }

    const logicalPoint = screenToLogical({ x: editor.x, y: editor.y }, viewportRef.current);

    const textElement: TextElement = {
      id: crypto.randomUUID(),
      type: "text",
      x: logicalPoint.x,
      y: logicalPoint.y,
      text: editor.value,
      fontSize: TEXT_FONT_SIZE,
      strokeColor: STROKE_COLOR,
    };
    elementsRef.current.push(textElement);
    creationOrderRef.current.push({ kind: "element", value: textElement });
    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      null, selectionRef.current,
      viewportRef.current, canvasSettings);
    resetDuplicateState(duplicateStateRef.current);
    addHistory();
  };

  const handleTextKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitText();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelText();
    }
  };

  const cancelInteraction = () => {
    alignmentGuidesRef.current = [];
    const canvas = canvasRef.current;
    const pointerId = activePointerIdRef.current;

    if (activeStrokeRef.current) {
      const activeStroke = activeStrokeRef.current;
      removeByReference(strokesRef.current, activeStroke);
      const creationIndex = creationOrderRef.current.findIndex(
        record => record.kind === "stroke" && record.value === activeStroke,
      );
      if (creationIndex >= 0) {
        creationOrderRef.current.splice(creationIndex, 1);
      }
      activeStrokeRef.current = null;
    }

    if (multiDragRef.current) {
      multiDragRef.current.selections.forEach((selection, index) => {
        const original = multiDragRef.current?.originals[index];
        if (original) {
          moveSelection(selection, original, 0, 0);
        }
      });
      multiDragRef.current = null;
    }

    if (rotationRef.current) {
      const rotation = rotationRef.current;
      // Revert rotation if cancelled
      applyRotation(
        rotation.selections,
        rotation.originals,
        rotation.originalElements,
        0,
        { x: rotation.centerX, y: rotation.centerY },
        elementsRef.current
      );
      rotationRef.current = null;
    }

    if (dragRef.current) {
      const { selection, original } = dragRef.current;
      if (selection.kind === "stroke" && Array.isArray(original)) {
        selection.value.splice(0, selection.value.length, ...original.map(point => ({ ...point })));
      } else if (selection.kind === "element" && !Array.isArray(original)) {
        Object.assign(selection.value, original);
      }
      dragRef.current = null;
    }

    if (marqueeRef.current) {
      // Cancel active marquee and restore the selection that existed before it started.
      marqueeRef.current = null;
      selectionRef.current = [...preMarqueeSelectionRef.current];
      notifyLayerChange();
    }

    if (panRef.current) {
      viewportRef.current = {
        ...viewportRef.current,
        offsetX: panRef.current.originOffsetX,
        offsetY: panRef.current.originOffsetY,
      };
      panRef.current = null;
    }

    activeRectangleRef.current = null;
    activeRectangleStartRef.current = null;
    activeCircleRef.current = null;
    activeCircleStartRef.current = null;
    activeArrowRef.current = null;
    activeArrowStartRef.current = null;

    if (canvas && pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    activePointerIdRef.current = null;
    if (canvas) canvas.style.cursor = activeToolRef.current === "hand" ? "grab" : "";

    drawCanvas();
  };

  const moveSelectedByKeyboard = (deltaX: number, deltaY: number) => {
    const selection = selectionRef.current;
    if (selection.length === 0) {
      return false;
    }

    const flatSelections = flattenSelection(selection);
    const movableSelections = flatSelections.filter(item => !isItemLocked(item, elementsRef.current));
    if (movableSelections.length === 0) {
      return false;
    }

    movableSelections.forEach(item => {
      moveSelection(item, cloneSelectionValue(item), deltaX, deltaY);
    });
    keyboardMovementPendingRef.current = true;
    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      null, selectionRef.current,
      viewportRef.current, canvasSettings);
    return true;
  };

  const finishKeyboardMovement = () => {
    if (!keyboardMovementPendingRef.current) {
      return;
    }

    keyboardMovementPendingRef.current = false;
    resetDuplicateState(duplicateStateRef.current);
    addHistory();
  };

  const keyboardActionsRef = useRef({
    addHistory,
    cancelInteraction,
    handleCopy,
    handleDuplicate,
    handlePaste,
    handleRedo,
    handleUndo,
    finishKeyboardMovement,
    moveSelectedByKeyboard,
    handleLayerOperation,
    notifyClipboardChange,
    notifyLayerChange,
    onToolSelect,
    handleGroup,
    handleUngroup,
    deleteSelection: handleDeleteSelection,
    handleLock,
    handleUnlock,
  });
  keyboardActionsRef.current = {
    addHistory,
    cancelInteraction,
    handleCopy,
    handleDuplicate,
    handlePaste,
    handleRedo,
    handleUndo,
    finishKeyboardMovement,
    moveSelectedByKeyboard,
    handleLayerOperation,
    notifyClipboardChange,
    notifyLayerChange,
    onToolSelect,
    handleGroup,
    handleUngroup,
    deleteSelection: handleDeleteSelection,
    handleLock,
    handleUnlock,
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const actions = keyboardActionsRef.current;
      if (isTextEditingTarget(event.target)) {
        return;
      }

      if (event.key === "Escape") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        if (textEditorRef.current) {
          cancelText();
        } else if (activePointerIdRef.current !== null || dragRef.current || activeStrokeRef.current) {
          actions.cancelInteraction();
        } else {
          selectionRef.current = [];
          renderCanvas(
            canvasRef.current,
            strokesRef.current,
            elementsRef.current,
            null, selectionRef.current,
            viewportRef.current, canvasSettings);
          actions.notifyClipboardChange();
          actions.notifyLayerChange();
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        actions.finishKeyboardMovement();
        actions.deleteSelection();
        return;
      }

      const isMac = navigator.userAgent.toLowerCase().includes("mac");
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      const layerModifierKey = event.ctrlKey || event.metaKey;
      const layerShortcut = layerModifierKey && (
        event.code === "BracketRight" || event.code === "BracketLeft"
      );
      if (layerShortcut) {
        event.preventDefault();
        actions.finishKeyboardMovement();
        const operation: LayerOperation = event.code === "BracketRight"
          ? event.shiftKey ? "bring-to-front" : "bring-forward"
          : event.shiftKey ? "send-to-back" : "send-backward";
        actions.handleLayerOperation(operation);
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "z") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        if (event.shiftKey) actions.handleRedo();
        else actions.handleUndo();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "c") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        actions.handleCopy();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "v") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        actions.handlePaste();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "d") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        actions.handleDuplicate();
        return;
      }
      if (modifierKey && event.key.toLowerCase() === "g") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        if (event.shiftKey) actions.handleUngroup();
        else actions.handleGroup();
        return;
      }
      if (modifierKey && event.shiftKey && event.key.toLowerCase() === "l") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        actions.handleLock();
        return;
      }
      if (modifierKey && event.shiftKey && event.key.toLowerCase() === "u") {
        actions.finishKeyboardMovement();
        event.preventDefault();
        actions.handleUnlock();
        return;
      }
      if (hasShortcutModifier(event)) {
        return;
      }

      const movement = {
        ArrowUp: { deltaX: 0, deltaY: event.shiftKey ? -10 : -1 },
        ArrowDown: { deltaX: 0, deltaY: event.shiftKey ? 10 : 1 },
        ArrowLeft: { deltaX: event.shiftKey ? -10 : -1, deltaY: 0 },
        ArrowRight: { deltaX: event.shiftKey ? 10 : 1, deltaY: 0 },
      }[event.key];
      if (movement) {
        if (actions.moveSelectedByKeyboard(movement.deltaX, movement.deltaY)) {
          event.preventDefault();
        }
        return;
      }

      const tool = getToolForShortcut(event.key);
      if (!tool) return;
      event.preventDefault();
      actions.finishKeyboardMovement();
      if (activePointerIdRef.current !== null || dragRef.current || activeStrokeRef.current) {
        actions.cancelInteraction();
      }
      actions.onToolSelect(tool);
    };

    const handleKeyUp = (event: globalThis.KeyboardEvent) => {
      if (event.key.startsWith("Arrow")) {
        keyboardActionsRef.current.finishKeyboardMovement();
      }
    };

    const handleWindowBlur = () => {
      keyboardActionsRef.current.finishKeyboardMovement();
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const screenPoint = getPoint(event);

    if (activePointerIdRef.current === event.pointerId && activeTool === "hand" && panRef.current) {
      const pan = panRef.current;
      viewportRef.current = {
        offsetX: pan.originOffsetX + (screenPoint.x - pan.pointerStartX),
        offsetY: pan.originOffsetY + (screenPoint.y - pan.pointerStartY),
        scale: viewportRef.current.scale,
      };
      renderCanvas(
        canvasRef.current,
        strokesRef.current,
        elementsRef.current,
        [activeRectangleRef.current, activeCircleRef.current, activeArrowRef.current, activeLineRef.current, activeRoundedRectangleRef.current].find(Boolean) || null,
        selectionRef.current,
        viewportRef.current, canvasSettings);
      return;
    }

    const point = screenToLogical(screenPoint, viewportRef.current);

    if (activePointerIdRef.current !== event.pointerId) {
      if (activeTool === "hand") {
        event.currentTarget.style.cursor = "grab";
        return;
      }

      if (activeTool === "select") {
        const currentSelection = selectionRef.current;
        const context = canvasRef.current?.getContext("2d");
        if (currentSelection.length > 0 && context) {
          const hoveredHandle = findResizeHandleAtPoint(context, point, currentSelection, elementsRef.current);
          if (hoveredHandle === "rotate") {
            event.currentTarget.style.cursor = "grab";
          } else if (hoveredHandle === "top-left" || hoveredHandle === "bottom-right") {
            event.currentTarget.style.cursor = "nwse-resize";
          } else if (hoveredHandle === "top-right" || hoveredHandle === "bottom-left") {
            event.currentTarget.style.cursor = "nesw-resize";
          } else if (findSelectionAtPoint(context, point, creationOrderRef.current, true)) {
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

    if (activeTool === "select") {
      if (activePointerIdRef.current === event.pointerId && marqueeRef.current) {
        const marquee = marqueeRef.current;
        marquee.currentX = point.x;
        marquee.currentY = point.y;

        const dx = Math.abs(marquee.currentX - marquee.startX);
        const dy = Math.abs(marquee.currentY - marquee.startY);

        if (dx >= MIN_MARQUEE_DISTANCE || dy >= MIN_MARQUEE_DISTANCE) {
          const context = canvasRef.current?.getContext("2d");
          if (context) {
            const bounds = normalizeMarqueeBounds(marquee);
            const marqueeSelections = getMarqueeSelections(
              context,
              bounds,
              creationOrderRef.current,
              elementsRef.current,
              groupsRef.current,
            );

            if (marqueeShiftRef.current) {
              selectionRef.current = unionSelections(preMarqueeSelectionRef.current, marqueeSelections);
            } else {
              selectionRef.current = marqueeSelections;
            }
          }
        } else {
          if (marqueeShiftRef.current) {
            selectionRef.current = [...preMarqueeSelectionRef.current];
          }
        }
        drawCanvas();
        return;
      }

      const multiDrag = multiDragRef.current;
      if (multiDrag) {
        const rawDeltaX = point.x - multiDrag.pointerStart.x;
        const rawDeltaY = point.y - multiDrag.pointerStart.y;
        let deltaX = rawDeltaX;
        let deltaY = rawDeltaY;

        const context = canvasRef.current?.getContext("2d");
        if (context && multiDrag.originalBounds && canvasSettings.snapSettings?.enabled) {
          const rect = canvasRef.current?.getBoundingClientRect();
          const canvasDimensions = rect ? { width: rect.width, height: rect.height } : { width: 800, height: 600 };
          const snapResult = calculateSnap(
            context,
            multiDrag.selections,
            elementsRef.current,
            strokesRef.current,
            groupsRef.current,
            multiDrag.originalBounds,
            rawDeltaX,
            rawDeltaY,
            viewportRef.current,
            canvasDimensions,
            canvasSettings.snapSettings,
          );
          deltaX = snapResult.snappedDeltaX;
          deltaY = snapResult.snappedDeltaY;
          alignmentGuidesRef.current = snapResult.guides;
        } else {
          alignmentGuidesRef.current = [];
        }

        multiDrag.selections.forEach((selection, index) => {
          const original = multiDrag.originals[index];
          if (original) {
            moveSelection(selection, original, deltaX, deltaY);
          }
        });
        multiDrag.moved = multiDrag.moved || rawDeltaX !== 0 || rawDeltaY !== 0;
        drawCanvas();
        return;
      }

      const drag = dragRef.current;

      if (drag) {
        if (drag.type === "resize" && drag.handle) {
          alignmentGuidesRef.current = [];
          resizeSelection(
            drag.selection,
            drag.original as FreehandStroke | WhiteboardElement,
            point.x - drag.pointerStart.x,
            point.y - drag.pointerStart.y,
            drag.handle,
            canvasRef.current?.getContext("2d") ?? undefined,
          );
        } else {
          const rawDeltaX = point.x - drag.pointerStart.x;
          const rawDeltaY = point.y - drag.pointerStart.y;
          let deltaX = rawDeltaX;
          let deltaY = rawDeltaY;

          const context = canvasRef.current?.getContext("2d");
          const origBounds = context ? getSelectionBounds(context, drag.selection, elementsRef.current) : undefined;
          if (context && origBounds && canvasSettings.snapSettings?.enabled) {
            const rect = canvasRef.current?.getBoundingClientRect();
            const canvasDimensions = rect ? { width: rect.width, height: rect.height } : { width: 800, height: 600 };
            const snapResult = calculateSnap(
              context,
              [drag.selection],
              elementsRef.current,
              strokesRef.current,
              groupsRef.current,
              origBounds,
              rawDeltaX,
              rawDeltaY,
              viewportRef.current,
              canvasDimensions,
              canvasSettings.snapSettings,
            );
            deltaX = snapResult.snappedDeltaX;
            deltaY = snapResult.snappedDeltaY;
            alignmentGuidesRef.current = snapResult.guides;
          } else {
            alignmentGuidesRef.current = [];
          }
          moveSelection(drag.selection, drag.original, deltaX, deltaY);
        }
        drawCanvas();
      }
      return;
    }

    if (activeTool === "rectangle") {
      const rectangle = activeRectangleRef.current;
      const start = activeRectangleStartRef.current;

      if (rectangle && start) {
        activeRectangleRef.current = createRectangle(start, point);
      }
    } else if (activeTool === "circle") {
      const circle = activeCircleRef.current;
      const start = activeCircleStartRef.current;

      if (circle && start) {
        activeCircleRef.current = createCircle(start, point);
      }
    } else if (activeTool === "arrow") {
      const arrow = activeArrowRef.current;
      const start = activeArrowStartRef.current;

      if (arrow && start) {
        activeArrowRef.current = createArrow(start, point);
      }
    } else if (activeTool === "line") {
      const line = activeLineRef.current;
      const start = activeLineStartRef.current;

      if (line && start) {
        activeLineRef.current = createLine(start, point);
      }
    } else if (activeTool === "roundedRectangle") {
      const rect = activeRoundedRectangleRef.current;
      const start = activeRoundedRectangleStartRef.current;

      if (rect && start) {
        activeRoundedRectangleRef.current = createRoundedRectangle(start, point);
      }
    } else {
      const stroke = activeStrokeRef.current;

      if (stroke) {
        const lastPoint = stroke[stroke.length - 1];
        if (!lastPoint || shouldSamplePoint(lastPoint, point)) {
          stroke.push(point);
        }
      }
    }

    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      [activeRectangleRef.current, activeCircleRef.current, activeArrowRef.current, activeLineRef.current, activeRoundedRectangleRef.current].find(Boolean) || null,
      selectionRef.current,
      viewportRef.current,
      canvasSettings,
    );
  };

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activePointerIdRef.current !== event.pointerId) {
      return;
    }

    if (activeTool === "hand") {
      panRef.current = null;
      activePointerIdRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      event.currentTarget.style.cursor = "grab";
      return;
    }


    if (activeTool === "rectangle") {
      const rectangle = activeRectangleRef.current;

      if (rectangle && rectangle.width > 0 && rectangle.height > 0) {
        elementsRef.current.push(rectangle);
        creationOrderRef.current.push({ kind: "element", value: rectangle });
      }
      activeRectangleRef.current = null;
      activeRectangleStartRef.current = null;
    } else if (activeTool === "circle") {
      const circle = activeCircleRef.current;

      if (circle && circle.width > 0 && circle.height > 0) {
        elementsRef.current.push(circle);
        creationOrderRef.current.push({ kind: "element", value: circle });
      }
      activeCircleRef.current = null;
      activeCircleStartRef.current = null;
      } else if (activeTool === "arrow") {
        const arrow = activeArrowRef.current;

        if (arrow && (arrow.startX !== arrow.endX || arrow.startY !== arrow.endY)) {
          elementsRef.current.push(arrow);
          creationOrderRef.current.push({ kind: "element", value: arrow });
        }
        activeArrowRef.current = null;
        activeArrowStartRef.current = null;
      } else if (activeTool === "line") {
        const line = activeLineRef.current;

        if (line && (line.startX !== line.endX || line.startY !== line.endY)) {
          elementsRef.current.push(line);
          creationOrderRef.current.push({ kind: "element", value: line });
        }
        activeLineRef.current = null;
        activeLineStartRef.current = null;
      } else if (activeTool === "roundedRectangle") {
        const rect = activeRoundedRectangleRef.current;

        if (rect && rect.width > 0 && rect.height > 0) {
          elementsRef.current.push(rect);
          creationOrderRef.current.push({ kind: "element", value: rect });
        }
        activeRoundedRectangleRef.current = null;
        activeRoundedRectangleStartRef.current = null;
      } else {
      activeStrokeRef.current = null;
    }

    if (activeTool === "select") {
      if (marqueeRef.current) {
        const marquee = marqueeRef.current;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        activePointerIdRef.current = null;
        marqueeRef.current = null;

        if (event.type === "pointercancel") {
          selectionRef.current = [...preMarqueeSelectionRef.current];
          notifyLayerChange();
          drawCanvas();
          return;
        }

        const point = screenToLogical(getPoint(event), viewportRef.current);
        const dx = Math.abs(point.x - marquee.startX);
        const dy = Math.abs(point.y - marquee.startY);

        if (dx >= MIN_MARQUEE_DISTANCE || dy >= MIN_MARQUEE_DISTANCE) {
          const context = canvasRef.current?.getContext("2d");
          if (context) {
            const bounds = normalizeMarqueeBounds({
              startX: marquee.startX,
              startY: marquee.startY,
              currentX: point.x,
              currentY: point.y,
            });
            const marqueeSelections = getMarqueeSelections(
              context,
              bounds,
              creationOrderRef.current,
              elementsRef.current,
              groupsRef.current,
            );
            if (marqueeShiftRef.current) {
              selectionRef.current = unionSelections(preMarqueeSelectionRef.current, marqueeSelections);
            } else {
              selectionRef.current = marqueeSelections;
            }
          }
          notifyLayerChange();
        } else {
          if (marqueeShiftRef.current) {
            selectionRef.current = [...preMarqueeSelectionRef.current];
          } else {
            selectionRef.current = [];
          }
          notifyLayerChange();
        }

        drawCanvas();
        return;
      }

      const rotation = rotationRef.current;
      if (rotation) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        rotationRef.current = null;
        activePointerIdRef.current = null;
        renderCanvas(
          canvasRef.current,
          strokesRef.current,
          elementsRef.current,
          null, selectionRef.current,
          viewportRef.current, canvasSettings);
        if (rotation.moved) {
          resetDuplicateState(duplicateStateRef.current);
          addHistory();
        }
        return;
      }

      const multiDrag = multiDragRef.current;
      if (multiDrag) {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        if (!multiDrag.moved) {
          selectionRef.current = [multiDrag.clicked];
          resetDuplicateState(duplicateStateRef.current);
          notifyLayerChange();
        } else {
          resetDuplicateState(duplicateStateRef.current);
        }
        multiDragRef.current = null;
        dragRef.current = null;
        activePointerIdRef.current = null;
        alignmentGuidesRef.current = [];
        drawCanvas();
        if (multiDrag.moved) {
          addHistory();
        }
        return;
      }

      dragRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activePointerIdRef.current = null;
      alignmentGuidesRef.current = [];
      drawCanvas();
      resetDuplicateState(duplicateStateRef.current);
      addHistory();
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    activePointerIdRef.current = null;
    renderCanvas(
      canvasRef.current,
      strokesRef.current,
      elementsRef.current,
      null, selectionRef.current,
      viewportRef.current, canvasSettings);
    addHistory();
  };

  const handlePointerLeave = (event: PointerEvent<HTMLCanvasElement>) => {
    if (activeTool !== "select") {
      stopDrawing(event);
    }
  };



  const eraseAtPoint = (point: Point) => {
    const context = canvasRef.current?.getContext("2d");

    if (!context) {
      return;
    }

    for (let index = creationOrderRef.current.length - 1; index >= 0; index -= 1) {
      const record = creationOrderRef.current[index];

      if (!record) {
        continue;
      }

      const isHit = record.kind === "stroke"
        ? isPointOnStroke(point, record.value)
        : isPointOnElement(context, point, record.value);

      if (!isHit) {
        continue;
      }

      if (isItemLocked(record as Selection, elementsRef.current)) {
        continue;
      }

      if (record.kind === "stroke") {
        removeByReference(strokesRef.current, record.value);
      } else {
        removeByReference(elementsRef.current, record.value);
        removeElementFromGroups(record.value.id, groupsRef.current);
      }
      creationOrderRef.current.splice(index, 1);
      
      // Also need to remove the group from selection if it was dissolved or erased
      selectionRef.current = selectionRef.current.filter(selection => {
        if (selectionIncludes([record], selection)) return false;
        if (selection.kind === "group" && !groupsRef.current.some(g => g.id === selection.value.id)) return false;
        return true;
      });
      notifyLayerChange();
      renderCanvas(
        canvasRef.current,
        strokesRef.current,
        elementsRef.current,
        null, selectionRef.current,
        viewportRef.current, canvasSettings);
      resetDuplicateState(duplicateStateRef.current);
      addHistory();
      return;
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
          onBlur={commitText}
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
    </section>
  );
});

BoardCanvas.displayName = "BoardCanvas";



