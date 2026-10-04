import { exportToPng } from "@/export/png";
import { exportToSvg } from "@/export/svg";
import { exportToSketchFlowDocument } from "@/document/serialization";
import type { CanvasSettings, CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";

export function handleExportCanvas(
  format: "png" | "svg" | "sketchflow",
  backgroundColor: string,
  boardName: string | undefined,
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  groups: Group[],
  creationOrder: CreationRecord[],
  canvasSettings: CanvasSettings,
) {
  // Export is a read-only operation; it must NOT modify any editor state.
  if (format === "svg") {
    exportToSvg(strokes, elements, backgroundColor, creationOrder);
  } else if (format === "png") {
    exportToPng(strokes, elements, backgroundColor, creationOrder);
  } else if (format === "sketchflow") {
    exportToSketchFlowDocument(strokes, elements, groups, creationOrder, canvasSettings, boardName);
  }
}
