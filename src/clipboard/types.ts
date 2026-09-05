import type { Selection, WhiteboardElement } from "@/types/canvas";

export type ClipboardState = {
  item: {
    selections: Selection[];
    elements: WhiteboardElement[];
  } | null;
};
