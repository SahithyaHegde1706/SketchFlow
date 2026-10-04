import type { CreationRecord } from "@/types/canvas";
import type { SelectionSet } from "@/types/editor";

export type LayerOperation =
  | "bring-forward"
  | "send-backward"
  | "bring-to-front"
  | "send-to-back";

function isSelected(records: CreationRecord, selections: SelectionSet) {
  return selections.some(selection =>
    selection.kind === "group"
      ? records.kind === "element" && selection.value.elementIds.includes(records.value.id)
      : records.kind === selection.kind && (
      records.value === selection.value ||
      (records.kind === "element" && selection.kind === "element" && records.value.id === selection.value.id)
    )
  );
}

function moveRecord(records: CreationRecord[], from: number, to: number) {
  const [record] = records.splice(from, 1);
  if (!record) {
    return false;
  }

  records.splice(to, 0, record);
  return true;
}

export function bringForward(records: CreationRecord[], selections: SelectionSet) {
  let changed = false;
  for (let index = records.length - 2; index >= 0; index -= 1) {
    if (isSelected(records[index]!, selections) && !isSelected(records[index + 1]!, selections)) {
      moveRecord(records, index, index + 1);
      changed = true;
    }
  }
  return changed;
}

export function sendBackward(records: CreationRecord[], selections: SelectionSet) {
  let changed = false;
  for (let index = 1; index < records.length; index += 1) {
    if (isSelected(records[index]!, selections) && !isSelected(records[index - 1]!, selections)) {
      moveRecord(records, index, index - 1);
      changed = true;
    }
  }
  return changed;
}

export function bringToFront(records: CreationRecord[], selections: SelectionSet) {
  const selected = records.filter(record => isSelected(record, selections));
  if (selected.length === 0 || selected.length === records.length) {
    return false;
  }

  const remaining = records.filter(record => !isSelected(record, selections));
  records.splice(0, records.length, ...remaining, ...selected);
  return true;
}

export function sendToBack(records: CreationRecord[], selections: SelectionSet) {
  const selected = records.filter(record => isSelected(record, selections));
  if (selected.length === 0 || selected.length === records.length) {
    return false;
  }

  const remaining = records.filter(record => !isSelected(record, selections));
  records.splice(0, records.length, ...selected, ...remaining);
  return true;
}

export function applyLayerOperation(
  records: CreationRecord[],
  selections: SelectionSet,
  operation: LayerOperation,
) {
  switch (operation) {
    case "bring-forward":
      return bringForward(records, selections);
    case "send-backward":
      return sendBackward(records, selections);
    case "bring-to-front":
      return bringToFront(records, selections);
    case "send-to-back":
      return sendToBack(records, selections);
  }
}
