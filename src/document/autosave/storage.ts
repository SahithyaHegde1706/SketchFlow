import type { SketchFlowDocumentV1 } from "../types";

export const AUTOSAVE_KEY = "sketchflow-autosave";
const DATABASE_NAME = "sketchflow-storage";
const DATABASE_VERSION = 1;
const DOCUMENT_STORE = "documents";
const DOCUMENT_ID = "autosave";
let databasePromise: Promise<IDBDatabase> | null = null;

export function openAutosaveDatabase(): Promise<IDBDatabase> {
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

export function writeToIndexedDB(doc: SketchFlowDocumentV1): Promise<void> {
  return openAutosaveDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, "readwrite");
    transaction.objectStore(DOCUMENT_STORE).put(doc, DOCUMENT_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Document storage write failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Document storage write was aborted."));
  }));
}

export function readFromIndexedDB(): Promise<unknown | null> {
  return openAutosaveDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, "readonly");
    const request = transaction.objectStore(DOCUMENT_STORE).get(DOCUMENT_ID);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error ?? new Error("Document storage read failed."));
  }));
}

export function removeFromIndexedDB(): Promise<void> {
  return openAutosaveDatabase().then(database => new Promise((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE, "readwrite");
    transaction.objectStore(DOCUMENT_STORE).delete(DOCUMENT_ID);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Document storage delete failed."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Document storage delete was aborted."));
  }));
}

