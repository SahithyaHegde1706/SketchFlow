import type { CanvasSettings, CreationRecord, FreehandStroke, Group, WhiteboardElement } from "@/types/canvas";
import type { SerializedCreationRecord, SketchFlowDocumentV1 } from "../types";
import { AUTOSAVE_KEY, readFromIndexedDB, removeFromIndexedDB, writeToIndexedDB } from "./storage";
import { isValidDocument } from "./validation";

const LOCAL_STORAGE_MAX_SIZE = 4.5 * 1024 * 1024;
let saveQueue: Promise<void> = Promise.resolve();

/**
 * Save the current document to browser storage.
 * IndexedDB is the primary store; localStorage remains a protected small-document fallback.
 * Returns true if at least one store accepted the current document.
 */
export function saveToLocalStorage(
  strokes: FreehandStroke[],
  elements: WhiteboardElement[],
  groups: Group[],
  creationOrder: CreationRecord[],
  canvasSettings: CanvasSettings,
  name?: string
): Promise<boolean> {
  const saveTask = saveQueue.then(async () => {
    let doc: SketchFlowDocumentV1;
    let json: string;
    let dataSize: number;
    try {
      // Serialize creationOrder without duplicating the full object data.
      const serializedOrder: SerializedCreationRecord[] = creationOrder.map((record) => {
        if (record.kind === "stroke") {
          const index = strokes.indexOf(record.value);
          return { kind: "stroke", index: index >= 0 ? index : strokes.length };
        }
        return { kind: "element", id: record.value.id };
      });

      doc = {
        version: 1,
        type: "sketchflow-document",
        name: name || undefined,
        canvasSettings,
        strokes,
        elements,
        groups,
        creationOrder: serializedOrder,
      };

      json = JSON.stringify(doc);
      dataSize = new Blob([json]).size;
    } catch (err) {
      console.error("[SketchFlow] Autosave serialization failed:", err);
      return false;
    }

    let indexedDbSaved = false;
    try {
      await writeToIndexedDB(doc);
      indexedDbSaved = true;
    } catch (err) {
      console.error("[SketchFlow] IndexedDB autosave failed (including possible storage quota exhaustion):", err);
    }

    let localStorageSaved = false;
    try {
      if (dataSize <= LOCAL_STORAGE_MAX_SIZE) {
        localStorage.setItem(AUTOSAVE_KEY, json);
        localStorageSaved = true;
      } else {
        // A larger document is stored in IndexedDB; remove any older small cache
        // so it cannot be mistaken for the latest version if storage is unavailable.
        localStorage.removeItem(AUTOSAVE_KEY);
      }
    } catch (err) {
      console.warn("[SketchFlow] Local storage cache unavailable:", err);
    }

    if (!indexedDbSaved && localStorageSaved) {
      try {
        await removeFromIndexedDB();
      } catch (err) {
        // A failed/unavailable database is ignored by restore, which then uses the fresh local cache.
        console.warn("[SketchFlow] Could not clear an older IndexedDB autosave:", err);
      }
    }

    if (!indexedDbSaved && !localStorageSaved) {
      console.error("[SketchFlow] Autosave failed: browser storage could not persist this document.");
      return false;
    }
    return true;
  });
  saveQueue = saveTask.then(() => undefined, () => undefined);
  return saveTask;
}

/**
 * Load the autosaved document, preferring IndexedDB and falling back to localStorage.
 * Returns the document if valid, null otherwise.
 */
export async function loadFromLocalStorage(): Promise<SketchFlowDocumentV1 | null> {
  try {
    const data = await readFromIndexedDB();
    if (isValidDocument(data)) return data;
  } catch (err) {
    console.warn("[SketchFlow] IndexedDB restore unavailable; checking legacy local storage:", err);
  }

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
 * Clear the autosaved document from both browser stores.
 */
export async function clearAutosave(): Promise<void> {
  try {
    await removeFromIndexedDB();
  } catch (err) {
    console.error("[SketchFlow] Failed to clear IndexedDB autosave:", err);
  }
  try {
    localStorage.removeItem(AUTOSAVE_KEY);
  } catch (err) {
    console.error("[SketchFlow] Failed to clear autosave:", err);
  }
}

/**
 * Check if there is an autosaved document available.
 */
export async function hasAutosave(): Promise<boolean> {
  try {
    if (isValidDocument(await readFromIndexedDB())) return true;
  } catch (err) {
    console.warn("[SketchFlow] Could not inspect IndexedDB autosave:", err);
  }
  try {
    return localStorage.getItem(AUTOSAVE_KEY) !== null;
  } catch (err) {
    console.error("[SketchFlow] Failed to check autosave:", err);
    return false;
  }
}

