import { getBackendUrl, createBoard } from "@/collaboration/boards";
import { isValidDocument } from "@/document/autosave/validation";
import type { SketchFlowDocumentV1 } from "@/document/types";
import type { CanvasSettings } from "@/types/canvas";
import { DEFAULT_DOCUMENT_NAME } from "@/document/defaults";

export interface BoardLoadResult {
  id: string;
  status: "ready" | "not-found" | "error";
  document?: SketchFlowDocumentV1;
  boardName?: string;
  canvasSettings?: CanvasSettings;
}

export async function loadBoard(boardId: string): Promise<BoardLoadResult> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/boards/${encodeURIComponent(boardId)}`, { cache: "no-store" });
    if (response.status === 404) {
      return { id: boardId, status: "not-found" };
    }
    if (!response.ok) throw new Error("Board service is unavailable");
    const result = await response.json() as { board?: { id?: unknown; name?: unknown; document?: unknown } };
    if (!result.board || result.board.id !== boardId || !isValidDocument(result.board.document)) {
      return { id: boardId, status: "not-found" };
    }
    const savedDocument = result.board.document as SketchFlowDocumentV1;
    const boardName = typeof result.board.name === "string" ? result.board.name : savedDocument.name || DEFAULT_DOCUMENT_NAME;
    return {
      id: boardId,
      status: "ready",
      document: savedDocument,
      boardName,
      canvasSettings: savedDocument.canvasSettings,
    };
  } catch (error) {
    console.error("[SketchFlow] Board load failed:", error);
    return { id: boardId, status: "error" };
  }
}

export async function createNewBoard(): Promise<{ path: string }> {
  return await createBoard();
}

export async function renameBoard(boardId: string, name: string): Promise<void> {
  const response = await fetch(`${getBackendUrl()}/api/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error("Board name could not be saved");
}
