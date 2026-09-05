import type { CreationRecord, Selection } from "@/types/canvas";

export type LayerOperation =
  | "bring-forward"
  | "send-backward"
  | "bring-to-front"
  | "send-to-back";

export type LayerAvailability = {
  canBringForward: boolean;
  canSendBackward: boolean;
  canBringToFront: boolean;
  canSendToBack: boolean;
};

function selectedIndex(records: CreationRecord[], selection: Selection | null) {
  if (!selection) {
    return -1;
  }

  return records.findIndex(record => record.kind === selection.kind && record.value === selection.value);
}

function moveRecord(records: CreationRecord[], from: number, to: number) {
  const [record] = records.splice(from, 1);
  if (!record) {
    return false;
  }

  records.splice(to, 0, record);
  return true;
}

export function bringForward(records: CreationRecord[], selection: Selection | null) {
  const index = selectedIndex(records, selection);
  return index >= 0 && index < records.length - 1 ? moveRecord(records, index, index + 1) : false;
}

export function sendBackward(records: CreationRecord[], selection: Selection | null) {
  const index = selectedIndex(records, selection);
  return index > 0 ? moveRecord(records, index, index - 1) : false;
}

export function bringToFront(records: CreationRecord[], selection: Selection | null) {
  const index = selectedIndex(records, selection);
  return index >= 0 && index < records.length - 1 ? moveRecord(records, index, records.length - 1) : false;
}

export function sendToBack(records: CreationRecord[], selection: Selection | null) {
  const index = selectedIndex(records, selection);
  return index > 0 ? moveRecord(records, index, 0) : false;
}

export function getLayerAvailability(
  records: CreationRecord[],
  selection: Selection | null,
): LayerAvailability {
  const index = selectedIndex(records, selection);
  const hasSelection = index >= 0;

  return {
    canBringForward: hasSelection && index < records.length - 1,
    canSendBackward: hasSelection && index > 0,
    canBringToFront: hasSelection && index < records.length - 1,
    canSendToBack: hasSelection && index > 0,
  };
}

export function applyLayerOperation(
  records: CreationRecord[],
  selection: Selection | null,
  operation: LayerOperation,
) {
  switch (operation) {
    case "bring-forward":
      return bringForward(records, selection);
    case "send-backward":
      return sendBackward(records, selection);
    case "bring-to-front":
      return bringToFront(records, selection);
    case "send-to-back":
      return sendToBack(records, selection);
  }
}