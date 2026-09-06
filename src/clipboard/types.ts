import type { CreationRecord, Group, Selection, SelectionSet, WhiteboardElement } from "@/types/canvas";

export type ClipboardState = {
  item: {
    selections: Selection[];
    elements: WhiteboardElement[];
    groups: Group[];
    creationRecords?: CreationRecord[];
  } | null;
};

export type DuplicateState = {
  sequenceCount: number;
  lastSelectionSnapshot: SelectionSet | null;
};
