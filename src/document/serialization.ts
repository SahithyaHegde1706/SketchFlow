import type { CanvasSettings, CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { SketchFlowDocumentV1, SerializedCreationRecord } from "./types";

/**
 * Triggers a browser download of the current whiteboard document.
 */
export function exportToSketchFlowDocument(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  groups: Group[],
  creationOrder: CreationRecord[],
  canvasSettings: CanvasSettings,
  name?: string
): void {
  try {
    // Serialize creationOrder without duplicating the full object data
    const serializedOrder: SerializedCreationRecord[] = creationOrder.map((record) => {
      if (record.kind === "stroke") {
        const index = strokes.indexOf(record.value);
        return { kind: "stroke", index: index >= 0 ? index : strokes.length }; // fallback to end if not found
      } else {
        return { kind: "element", id: record.value.id };
      }
    });

    const doc: SketchFlowDocumentV1 = {
      version: 1,
      type: "sketchflow-document",
      name: name || undefined,
      canvasSettings,
      strokes,
      elements,
      groups,
      creationOrder: serializedOrder,
    };

    const json = JSON.stringify(doc, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "sketchflow-board.sketchflow.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  } catch (err) {
    console.error("[SketchFlow] Document export failed:", err);
  }
}
