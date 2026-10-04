import { applyLayerOperation as applyLayerOperationToRecords, type LayerOperation } from "@/editor/layering";
import { groupSelection, ungroupSelection } from "@/editor/grouping";
import { isAnySelectionLocked, isItemLocked, setSelectionLock } from "@/editor/locking";
import {
  areSelectionsEqual,
  copyToClipboard,
  offsetClipboard,
  resetDuplicateState,
} from "@/clipboard/clipboard";
import type { ClipboardState, DuplicateState } from "@/clipboard/types";
import type { CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { Selection, SelectionSet } from "@/types/editor";
import { flattenSelection } from "@/components/board/canvas/selection";
import { cloneSelectionValue } from "@/editor/tools";
import { moveSelection } from "@/editor/movement";

type Ref<T> = { current: T };

export type CanvasEditingOptions = {
  strokesRef: Ref<FreehandStroke[]>;
  elementsRef: Ref<WhiteboardElement[]>;
  groupsRef: Ref<Group[]>;
  creationOrderRef: Ref<CreationRecord[]>;
  selectionRef: Ref<SelectionSet>;
  clipboardRef: Ref<ClipboardState>;
  duplicateStateRef: Ref<DuplicateState>;
  drawCanvas: () => void;
  addHistory: () => void;
  onClipboardChange?: (canCopy: boolean, canPaste: boolean, canDuplicate: boolean) => void;
};

export function createCanvasKeyboardMovementHandlers(options: {
  elementsRef: Ref<WhiteboardElement[]>;
  selectionRef: Ref<SelectionSet>;
  keyboardMovementPendingRef: Ref<boolean>;
  duplicateStateRef: Ref<DuplicateState>;
  drawKeyboardPreview: () => void;
  addHistory: () => void;
}) {
  const moveSelectedByKeyboard = (deltaX: number, deltaY: number) => {
    if (options.selectionRef.current.length === 0) return false;
    const selections = flattenSelection(options.selectionRef.current, options.elementsRef.current)
      .filter(selection => !isItemLocked(selection, options.elementsRef.current));
    if (selections.length === 0) return false;

    selections.forEach(selection => moveSelection(selection, cloneSelectionValue(selection), deltaX, deltaY));
    options.keyboardMovementPendingRef.current = true;
    options.drawKeyboardPreview();
    return true;
  };

  const finishKeyboardMovement = () => {
    if (!options.keyboardMovementPendingRef.current) return;
    options.keyboardMovementPendingRef.current = false;
    resetDuplicateState(options.duplicateStateRef.current);
    options.addHistory();
  };

  return { moveSelectedByKeyboard, finishKeyboardMovement };
}

export function createCanvasEditingHandlers(options: CanvasEditingOptions) {
  const {
    strokesRef,
    elementsRef,
    groupsRef,
    creationOrderRef,
    selectionRef,
    clipboardRef,
    duplicateStateRef,
    drawCanvas,
    addHistory,
    onClipboardChange,
  } = options;

  const notifyClipboardChange = () => {
    onClipboardChange?.(
      selectionRef.current.length > 0,
      !!clipboardRef.current.item,
      selectionRef.current.length > 0,
    );
  };

  const handleLock = () => {
    if (setSelectionLock(selectionRef.current, elementsRef.current, true)) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
    }
  };

  const handleUnlock = () => {
    if (setSelectionLock(selectionRef.current, elementsRef.current, false)) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
    }
  };

  const handleToggleLock = (target?: Selection) => {
    const targets = target ? [target] : selectionRef.current;
    const isLocked = isAnySelectionLocked(targets, elementsRef.current);
    if (setSelectionLock(targets, elementsRef.current, !isLocked)) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
    }
  };

  const handleGroup = () => {
    const group = groupSelection(selectionRef.current, elementsRef.current, groupsRef.current);
    if (group) {
      selectionRef.current = [{ kind: "group", value: group }];
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
    }
  };

  const handleUngroup = () => {
    const ungroupedIds = ungroupSelection(selectionRef.current, groupsRef.current);
    if (ungroupedIds.length > 0) {
      selectionRef.current = ungroupedIds
        .map(id => elementsRef.current.find(element => element.id === id))
        .filter((element): element is WhiteboardElement => !!element)
        .map(element => ({ kind: "element", value: element }));
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
    }
  };

  const handleLayerOperation = (operation: LayerOperation) => {
    if (!applyLayerOperationToRecords(creationOrderRef.current, selectionRef.current, operation)) {
      return;
    }

    drawCanvas();
    addHistory();
    resetDuplicateState(duplicateStateRef.current);
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
  };

  const handleDeleteSelection = () => {
    const toDelete = selectionRef.current.filter(selection => !isItemLocked(selection, elementsRef.current));
    if (toDelete.length > 0) {
      const deletedElementIds = new Set<string>();
      const deletedGroupIds = new Set<string>();
      const deletedStrokes = new Set<FreehandStroke>();

      for (const selection of toDelete) {
        if (selection.kind === "stroke") {
          deletedStrokes.add(selection.value);
        } else if (selection.kind === "group") {
          deletedGroupIds.add(selection.value.id);
          selection.value.elementIds.forEach(id => deletedElementIds.add(id));
        } else {
          deletedElementIds.add(selection.value.id);
        }
      }

      strokesRef.current = strokesRef.current.filter(stroke => !deletedStrokes.has(stroke));
      elementsRef.current = elementsRef.current.filter(element => !deletedElementIds.has(element.id));
      for (const group of groupsRef.current) {
        group.elementIds = group.elementIds.filter(id => !deletedElementIds.has(id));
      }
      groupsRef.current = groupsRef.current.filter(group =>
        !deletedGroupIds.has(group.id) && group.elementIds.length >= 2,
      );
      creationOrderRef.current = creationOrderRef.current.filter(record =>
        record.kind === "stroke"
          ? !deletedStrokes.has(record.value)
          : !deletedElementIds.has(record.value.id),
      );
      selectionRef.current = selectionRef.current.filter(selection => {
        if (selection.kind === "stroke") return !deletedStrokes.has(selection.value);
        if (selection.kind === "element") return !deletedElementIds.has(selection.value.id);
        return !deletedGroupIds.has(selection.value.id) && groupsRef.current.some(group => group.id === selection.value.id);
      });
      drawCanvas();
      addHistory();
    }
  };

  const handleUpdateProperties = (updates: Partial<WhiteboardElement>, commitHistory: boolean = true) => {
    if (selectionRef.current.length === 0) return;
    if (isAnySelectionLocked(selectionRef.current, elementsRef.current)) return;

    const applySafeUpdates = (element: WhiteboardElement, updates: Partial<WhiteboardElement>) => {
      const safeUpdates = { ...updates } as Record<string, unknown>;
      if (element.type !== "rectangle" && element.type !== "circle" && element.type !== "roundedRectangle") {
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
            const element = elementsRef.current.find(candidate => candidate.id === id);
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
      if (commitHistory) {
        addHistory();
        resetDuplicateState(duplicateStateRef.current);
      }
    }
  };

  const handleUpdateTextColor = (color: string) => {
    if (selectionRef.current.length === 0 || isAnySelectionLocked(selectionRef.current, elementsRef.current)) return;

    let changed = false;
    for (const selection of selectionRef.current) {
      if (selection.kind === "element" && selection.value.type === "text") {
        selection.value.strokeColor = color;
        changed = true;
      } else if (selection.kind === "group" && !isItemLocked(selection.value, elementsRef.current)) {
        for (const id of selection.value.elementIds) {
          const element = elementsRef.current.find(candidate => candidate.id === id);
          if (element?.type === "text" && !element.locked) {
            element.strokeColor = color;
            changed = true;
          }
        }
      }
    }

    if (changed) {
      drawCanvas();
      addHistory();
      resetDuplicateState(duplicateStateRef.current);
    }
  };

  return {
    notifyClipboardChange,
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
  };
}
