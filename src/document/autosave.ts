/**
 * Autosave and Local Persistence — Step 48
 *
 * Persists the current SketchFlow document to IndexedDB, with a size-limited
 * localStorage fallback/cache for small documents and legacy compatibility.
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
const DATABASE_NAME = "sketchflow-storage";
const DATABASE_VERSION = 1;
const DOCUMENT_STORE = "documents";
const DOCUMENT_ID = "autosave";
const AUTOSAVE_DEBOUNCE_MS = 1000; // 1 second debounce
const LOCAL_STORAGE_MAX_SIZE = 4.5 * 1024 * 1024;
let databasePromise: Promise<IDBDatabase> | null = null;
let saveQueue: Promise<void> = Promise.resolve();

function openAutosaveDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(DOCUMENT_STORE)) {
        request.result.createObjectStore(DOCUMENT_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open document storage."));
    request.onblocked = () => reject(new Error("Document storage upgrade is blocked by another tab."));
  }).catch((error: unknown) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise!;
}

function writeToIndexedDB(doc: SketchFlowDocumentV1): Promise<void> {
  return openAutosaveDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, "readwrite");
    transaction.objectStore(DOCUMENT_STORE).put(doc, DOCUMENT_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Document storage write failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Document storage write was aborted."));
  }));
}

function readFromIndexedDB(): Promise<unknown | null> {
  return openAutosaveDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, "readonly");
    const request = transaction.objectStore(DOCUMENT_STORE).get(DOCUMENT_ID);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Document storage read failed."));
  }));
}

function removeFromIndexedDB(): Promise<void> {
  return openAutosaveDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, "readwrite");
    transaction.objectStore(DOCUMENT_STORE).delete(DOCUMENT_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Document storage delete failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Document storage delete was aborted."));
  }));
}

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

  if (!isRecord(data.canvasSettings) || typeof data.canvasSettings.backgroundColor !== "string" || (data.canvasSettings.backgroundMode !== undefined && data.canvasSettings.backgroundMode !== "theme-default" && data.canvasSettings.backgroundMode !== "custom") || typeof data.canvasSettings.showGrid !== "boolean" || !isFiniteNumber(data.canvasSettings.gridSize) || data.canvasSettings.gridSize <= 0) return false;
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

/**
 * Create a debounced autosave function.
 */
export function createDebouncedAutosave(
  saveFn: () => void | Promise<unknown>,
  delay: number = AUTOSAVE_DEBOUNCE_MS
): () => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      void saveFn();
      timeoutId = null;
    }, delay);
  };
}
