import type {
  CanvasSettings,
  FreehandStroke,
  Group,
  WhiteboardElement,
} from "@/types/canvas";

export type SerializedCreationRecord =
  | { kind: "stroke"; index: number }
  | { kind: "element"; id: string };

export type SketchFlowDocumentV1 = {
  version: 1;
  type: "sketchflow-document";
  name?: string;
  canvasSettings: CanvasSettings;
  strokes: FreehandStroke[];
  elements: WhiteboardElement[];
  groups: Group[];
  creationOrder: SerializedCreationRecord[];
};
