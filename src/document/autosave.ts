/**
 * Autosave and Local Persistence — Step 48
 *
 * Automatically persists the current SketchFlow document to localStorage.
 * Reuses existing SketchFlow serialization/deserialization logic.
 */

import type {
  CanvasSettings,
  CreationRecord,
  FreehandStroke,
  Group,
  WhiteboardElement,
} from "@/types/canvas";
import type { SerializedCreationRecord, SketchFlowDocumentV1 } from "./types";

const AUTOSAVE_KEY = "sketchflow-autosave";
const AUTOSAVE_DEBOUNCE_MS = 1000; // 1 second debounce

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isValidDocument(data: unknown): data is SketchFlowDocumentV1 {
  if (!isRecord(data) || data.type !== "sketchflow-document" || data.version !== 1) return false;
  if (data.name !== undefined && typeof data.name !== "string") return false;
  if (!Array.isArray(data.strokes) || !Array.isArray(data.elements) || !Array.isArray(data.groups) || !Array.isArray(data.creationOrder)) return false;
  const strokeCount = data.strokes.length;

  if (!isRecord(data.canvasSettings) || typeof data.canvasSettings.backgroundColor !== "string" || typeof data.canvasSettings.showGrid !== "boolean" || !isFiniteNumber(data.canvasSettings.gridSize) || data.canvasSettings.gridSize <= 0) return false;
  const snapSettings = data.canvasSettings.snapSettings;
  if (!isRecord(snapSettings) || typeof snapSettings.enabled !== "boolean" || typeof snapSettings.gridEnabled !== "boolean" || !isFiniteNumber(snapSettings.gridSize) || snapSettings.gridSize <= 0 || !isFiniteNumber(snapSettings.threshold)) return false;

  for (const stroke of data.strokes) {
    if (!Array.isArray(stroke) || !stroke.every((point) => isRecord(point) && isFiniteNumber(point.x) && isFiniteNumber(point.y))) return false;
  }

  const elementIds = new Set<string>();
  for (const element of data.elements) {
    if (!isRecord(element) || typeof element.id !== "string" || elementIds.has(element.id)) return false;
    elementIds.add(element.id);
    if (element.rotation !== undefined && !isFiniteNumber(element.rotation)) return false;
    if (element.locked !== undefined && typeof element.locked !== "boolean") return false;

    if (element.type === "rectangle" || element.type === "circle" || element.type === "roundedRectangle" || element.type === "image") {
      if (!isFiniteNumber(element.x) || !isFiniteNumber(element.y) || !isFiniteNumber(element.width) || !isFiniteNumber(element.height)) return false;
      if (element.type === "roundedRectangle" && !isFiniteNumber(element.radius)) return false;
      if (element.type === "image") {
        if (typeof element.src !== "string" || !isFiniteNumber(element.naturalWidth) || !isFiniteNumber(element.naturalHeight)) return false;
        if (element.opacity !== undefined && !isFiniteNumber(element.opacity)) return false;
        if (element.flipX !== undefined && typeof element.flipX !== "boolean") return false;
        if (element.flipY !== undefined && typeof element.flipY !== "boolean") return false;
      }
    } else if (element.type === "line" || element.type === "arrow") {
      if (!isFiniteNumber(element.startX) || !isFiniteNumber(element.startY) || !isFiniteNumber(element.endX) || !isFiniteNumber(element.endY)) return false;
    } else if (element.type === "text") {
      if (!isFiniteNumber(element.x) || !isFiniteNumber(element.y) || typeof element.text !== "string" || !isFiniteNumber(element.fontSize)) return false;
    } else {
      return false;
    }
  }

  const groupIds = new Set<string>();
  for (const group of data.groups) {
    if (!isRecord(group) || typeof group.id !== "string" || groupIds.has(group.id) || !Array.isArray(group.elementIds)) return false;
    groupIds.add(group.id);
    if (group.locked !== undefined && typeof group.locked !== "boolean") return false;
    if (!group.elementIds.every((id) => typeof id === "string" && elementIds.has(id))) return false;
  }

  return data.creationOrder.every((record) => {
    if (!isRecord(record)) return false;
    if (record.kind === "stroke") {
      return Number.isInteger(record.index) && (record.index as number) >= 0 && (record.index as number) < strokeCount;
    }
    return record.kind === "element" && typeof record.id === "string" && elementIds.has(record.id);
  });
}

/**
 * Save the current document to localStorage.
 * Returns true if successful, false otherwise.
 */
export function saveToLocalStorage(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  groups: Group[],
  creationOrder: CreationRecord[],
  canvasSettings: CanvasSettings,
  name?: string
): boolean {
  try {
    // Serialize creationOrder without duplicating the full object data
    const serializedOrder: SerializedCreationRecord[] = creationOrder.map((record) => {
      if (record.kind === "stroke") {
        const index = strokes.indexOf(record.value);
        return { kind: "stroke", index: index >= 0 ? index : strokes.length };
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

    const json = JSON.stringify(doc);
    
    // Check if the data is too large for localStorage (typically ~5MB limit)
    const dataSize = new Blob([json]).size;
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB to leave some margin
    
    if (dataSize > maxSize) {
      console.warn("[SketchFlow] Autosave skipped: document too large for localStorage", dataSize);
      return false;
    }

    localStorage.setItem(AUTOSAVE_KEY, json);
    return true;
  } catch (err) {
    console.error("[SketchFlow] Autosave failed:", err);
    return false;
  }
}

/**
 * Load the autosaved document from localStorage.
 * Returns the document if valid, null otherwise.
 */
export function loadFromLocalStorage(): SketchFlowDocumentV1 | null {
  try {
    const json = localStorage.getItem(AUTOSAVE_KEY);
    if (!json) return null;

    const data: unknown = JSON.parse(json);
    return isValidDocument(data) ? data : null;
  } catch (err) {
    console.error("[SketchFlow] Failed to load autosaved document:", err);
    return null;
  }
}

/**
 * Clear the autosaved document from localStorage.
 */
export function clearAutosave(): void {
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (err) {
    console.error("[SketchFlow] Failed to clear autosave:", err);
  }
}

/**
 * Check if there is an autosaved document available.
 */
export function hasAutosave(): boolean {
  try {
    return localStorage.getItem(AUTOSAVE_KEY) !== null;
  } catch (err) {
    console.error("[SketchFlow] Failed to check autosave:", err);
    return false;
  }
}

/**
 * Create a debounced autosave function.
 */
export function createDebouncedAutosave(
  saveFn: () => void,
  delay: number = AUTOSAVE_DEBOUNCE_MS
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      saveFn();
      timeoutId = null;
    }, delay);
  };
}
