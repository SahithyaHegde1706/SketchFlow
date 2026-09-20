import type {
  CanvasSettings,
  CreationRecord,
  FreehandStroke,
  Group,
  WhiteboardElement,
} from "@/types/canvas";
import type { SketchFlowDocumentV1, SerializedCreationRecord } from "./types";

/**
 * Safely parse and validate an imported JSON string into a SketchFlow document.
 * Returns null if the document is malformed or unsupported.
 */
export function validateDocument(jsonText: string): SketchFlowDocumentV1 | null {
  try {
    const data = JSON.parse(jsonText);

    if (
      !data ||
      typeof data !== "object" ||
      data.type !== "sketchflow-document" ||
      data.version !== 1
    ) {
      return null;
    }

    if (!Array.isArray(data.strokes) || !Array.isArray(data.elements) || !Array.isArray(data.groups) || !Array.isArray(data.creationOrder)) {
      return null;
    }

    if (!data.canvasSettings || typeof data.canvasSettings !== "object") {
      return null;
    }

    // Validate elements
    const elementIds = new Set<string>();
    for (const el of data.elements) {
      if (!el || typeof el !== "object" || typeof el.id !== "string" || typeof el.type !== "string") return null;
      if (!["rectangle", "circle", "arrow", "line", "roundedRectangle", "text"].includes(el.type)) return null;
      if (!("x" in el) && !("startX" in el)) return null;
      if (elementIds.has(el.id)) return null; // duplicate ID
      elementIds.add(el.id);
    }

    // Validate strokes
    for (const stroke of data.strokes) {
      if (!Array.isArray(stroke)) return null;
      for (const pt of stroke) {
        if (!pt || typeof pt !== "object" || typeof pt.x !== "number" || typeof pt.y !== "number") return null;
      }
    }

    // Validate groups
    const groupIds = new Set<string>();
    for (const group of data.groups) {
      if (!group || typeof group !== "object" || typeof group.id !== "string" || !Array.isArray(group.elementIds)) return null;
      if (groupIds.has(group.id)) return null; // duplicate group ID
      groupIds.add(group.id);
      for (const id of group.elementIds) {
        if (typeof id !== "string" || !elementIds.has(id)) return null; // invalid reference
      }
    }

    // Validate creationOrder references
    for (const record of data.creationOrder) {
      if (!record || typeof record !== "object") return null;
      if (record.kind === "stroke") {
        if (typeof record.index !== "number" || record.index < 0 || record.index >= data.strokes.length) return null;
      } else if (record.kind === "element") {
        if (typeof record.id !== "string" || !elementIds.has(record.id)) return null;
      } else {
        return null;
      }
    }

    // Since we don't have a runtime type checking library (like zod), we rely on 
    // structural confidence from the above checks and let TS handle the rest internally.
    return data as SketchFlowDocumentV1;
  } catch {
    return null;
  }
}

/**
 * Triggers a browser download of the current whiteboard document.
 */
export function exportToSketchFlowDocument(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  groups: Group[],
  creationOrder: CreationRecord[],
  canvasSettings: CanvasSettings
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
