import type { Group, Selection, WhiteboardElement } from "@/types/canvas";

export type ClipboardState = {
  item: {
    selections: Selection[];
    elements: WhiteboardElement[];
    groups: Group[];
  } | null;
};
