import type { CreationRecord, Group, Selection, SelectionSet, WhiteboardElement, FreehandStroke } from "@/types/canvas";
import type { ClipboardState, DuplicateState } from "./types";

export function createDuplicateState(): DuplicateState {
  return {
    sequenceCount: 0,
    lastSelectionSnapshot: null,
  };
}

export function resetDuplicateState(state: DuplicateState): void {
  state.sequenceCount = 0;
  state.lastSelectionSnapshot = null;
}

export function areSelectionsEqual(setA: SelectionSet | null, setB: SelectionSet | null): boolean {
  if (!setA || !setB) return false;
  if (setA.length !== setB.length) return false;
  if (setA.length === 0) return false;

  return setA.every((itemA, index) => {
    const itemB = setB[index];
    if (!itemB || itemA.kind !== itemB.kind) return false;

    if (itemA.kind === "stroke" && itemB.kind === "stroke") {
      return itemA.value === itemB.value;
    }
    if (itemA.kind === "element" && itemB.kind === "element") {
      return itemA.value.id === itemB.value.id;
    }
    if (itemA.kind === "group" && itemB.kind === "group") {
      return itemA.value.id === itemB.value.id;
    }
    return false;
  });
}

export function copyToClipboard(
  selection: SelectionSet,
  elements: WhiteboardElement[],
  groups: Group[],
  creationOrder?: CreationRecord[]
): ClipboardState {
  if (selection.length === 0) {
    return { item: null };
  }

  // Deep clone to safely disconnect object references
  const selectedElementIds = new Set(selection.flatMap(item => {
    if (item.kind === "element") return [item.value.id];
    if (item.kind === "group") return item.value.elementIds;
    return [];
  }));
  const selectedGroups = groups.filter(group => selection.some(item => item.kind === "group" && item.value.id === group.id));

  const selectionsCopy = selection.map(item => {
    if (item.kind === "stroke") {
      const strokeCopy: FreehandStroke = item.value.map(p => ({ ...p }));
      if (item.value.locked) {
        strokeCopy.locked = true;
      }
      return { kind: "stroke" as const, value: strokeCopy };
    }
    return item;
  });

  const elementsCopy: WhiteboardElement[] = JSON.parse(
    JSON.stringify(elements.filter(element => selectedElementIds.has(element.id)))
  );
  const groupsCopy: Group[] = JSON.parse(JSON.stringify(selectedGroups));

  let creationRecordsCopy: CreationRecord[] | undefined;
  if (creationOrder) {
    const selectedStrokes = new Set(
      selection.filter((item): item is Extract<Selection, { kind: "stroke" }> => item.kind === "stroke").map(s => s.value)
    );
    creationRecordsCopy = creationOrder
      .filter(record => {
        if (record.kind === "element") {
          return selectedElementIds.has(record.value.id);
        }
        return selectedStrokes.has(record.value);
      })
      .map(record => {
        if (record.kind === "element") {
          const found = elementsCopy.find(e => e.id === record.value.id);
          return found ? { kind: "element" as const, value: found } : null;
        }
        const strokeIndex = selection.findIndex(s => s.kind === "stroke" && s.value === record.value);
        const strokeCopy = strokeIndex >= 0 ? (selectionsCopy[strokeIndex].value as FreehandStroke) : null;
        return strokeCopy ? { kind: "stroke" as const, value: strokeCopy } : null;
      })
      .filter((rec): rec is CreationRecord => rec !== null);
  }

  return {
    item: {
      selections: selectionsCopy,
      elements: elementsCopy,
      groups: groupsCopy,
      ...(creationRecordsCopy ? { creationRecords: creationRecordsCopy } : {}),
    },
  };
}

export function getClipboard(state: ClipboardState) {
  if (!state.item) {
    return null;
  }
  
  // Return deep clone to prevent accidental mutations by caller
  const item = state.item;
  const elementsCopy: WhiteboardElement[] = JSON.parse(JSON.stringify(item.elements));
  const groupsCopy: Group[] = JSON.parse(JSON.stringify(item.groups));
  const selectionsCopy = item.selections.map(sel => {
    if (sel.kind === "stroke") {
      const strokeCopy: FreehandStroke = sel.value.map(p => ({ ...p }));
      if (sel.value.locked) strokeCopy.locked = true;
      return { kind: "stroke" as const, value: strokeCopy };
    }
    return sel;
  });

  const creationRecordsCopy = item.creationRecords
    ? item.creationRecords.map(rec => {
        if (rec.kind === "element") {
          const found = elementsCopy.find(e => e.id === rec.value.id);
          return found ? { kind: "element" as const, value: found } : rec;
        }
        const strokeCopy: FreehandStroke = rec.value.map(p => ({ ...p }));
        if (rec.value.locked) strokeCopy.locked = true;
        return { kind: "stroke" as const, value: strokeCopy };
      })
    : undefined;

  return {
    selections: selectionsCopy,
    elements: elementsCopy,
    groups: groupsCopy,
    ...(creationRecordsCopy ? { creationRecords: creationRecordsCopy } : {}),
  };
}

export function offsetSelection(selection: Selection, offsetAmount: number = 20): Selection {
  if (selection.kind === "stroke") {
    // Strokes don't have IDs. Offset every point by offsetAmount.
    const stroke: FreehandStroke = selection.value.map(point => ({
      x: point.x + offsetAmount,
      y: point.y + offsetAmount,
    }));
    if (selection.value.locked) {
      stroke.locked = true;
    }
    return {
      kind: "stroke",
      value: stroke,
    };
  }

  if (selection.kind === "group") {
    const newGroup: Group = {
      ...selection.value,
      id: crypto.randomUUID(),
      elementIds: [...selection.value.elementIds],
    };
    return { kind: "group", value: newGroup };
  }

  // It's a structured element, offset position and create a new UUID
  const element = selection.value;
  let newElement: WhiteboardElement;
  const newId = crypto.randomUUID();

  if (element.type === "rectangle" || element.type === "roundedRectangle" || element.type === "circle" || element.type === "text") {
    newElement = {
      ...element,
      id: newId,
      x: element.x + offsetAmount,
      y: element.y + offsetAmount,
    };
  } else if (element.type === "arrow" || element.type === "line") {
    newElement = {
      ...element,
      id: newId,
      startX: element.startX + offsetAmount,
      startY: element.startY + offsetAmount,
      endX: element.endX + offsetAmount,
      endY: element.endY + offsetAmount,
    };
  } else {
    // Fallback
    newElement = { ...(element as WhiteboardElement), id: newId };
  }

  return { kind: "element", value: newElement };
}

export function offsetSelections(selections: SelectionSet, offsetAmount: number = 20): SelectionSet {
  return selections.map(selection => offsetSelection(selection, offsetAmount));
}

export function offsetClipboard(clipboard: NonNullable<ClipboardState["item"]>, offsetAmount = 20) {
  const idMap = new Map<string, string>();
  const elements = clipboard.elements.map(element => {
    const id = crypto.randomUUID();
    idMap.set(element.id, id);
    const copied = offsetSelection({ kind: "element", value: element }, offsetAmount);
    return { ...(copied.value as WhiteboardElement), id };
  });
  const groups = clipboard.groups.map(group => ({
    id: crypto.randomUUID(),
    elementIds: group.elementIds.map(id => idMap.get(id)).filter((id): id is string => !!id),
    ...(group.locked !== undefined ? { locked: group.locked } : {}),
  }));

  const strokeMap = new Map<FreehandStroke, FreehandStroke>();

  const selections = clipboard.selections.map(selection => {
    if (selection.kind === "element") {
      const element = elements.find(item => item.id === idMap.get(selection.value.id));
      return element ? { kind: "element" as const, value: element } : null;
    }
    if (selection.kind === "group") {
      const groupIndex = clipboard.groups.findIndex(group => group.id === selection.value.id);
      const group = groups[groupIndex];
      return group ? { kind: "group" as const, value: group } : null;
    }
    const offsetSel = offsetSelection(selection, offsetAmount);
    if (offsetSel.kind === "stroke") {
      strokeMap.set(selection.value, offsetSel.value);
    }
    return offsetSel;
  }).filter((selection): selection is Selection => selection !== null);

  const creationRecords: CreationRecord[] = clipboard.creationRecords
    ? clipboard.creationRecords.map(record => {
        if (record.kind === "element") {
          const newId = idMap.get(record.value.id);
          const element = elements.find(e => e.id === newId);
          return element ? { kind: "element" as const, value: element } : null;
        }
        const stroke = strokeMap.get(record.value) ?? (offsetSelection({ kind: "stroke", value: record.value }, offsetAmount).value as FreehandStroke);
        return { kind: "stroke" as const, value: stroke };
      }).filter((rec): rec is CreationRecord => rec !== null)
    : [
        ...elements.map(e => ({ kind: "element" as const, value: e })),
        ...selections.filter((s): s is Extract<Selection, { kind: "stroke" }> => s.kind === "stroke").map(s => ({ kind: "stroke" as const, value: s.value })),
      ];

  return { selections, elements, groups, creationRecords };
}
