import type { CreationRecord, Group, WhiteboardElement } from "@/types/canvas";
import type { Selection, SelectionSet } from "@/types/editor";

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
