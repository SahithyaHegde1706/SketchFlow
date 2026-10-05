import type { Collaborator } from "@/collaboration/presenceStore";
import type { SelectionSet } from "@/types/editor";
import type { CreationRecord } from "@/types/canvas";
import { flattenSelection } from "@/components/board/canvas/selection";

export function getSelectedElementIds(selections: SelectionSet, records: CreationRecord[]) {
  const elements = records.flatMap((record) => record.kind === "element" ? [record.value] : []);
  return [...new Set(flattenSelection(selections, elements)
    .flatMap((selection) => selection.kind === "element" ? [selection.value.id] : []))].sort();
}

export function createCollaborator(): Collaborator {
  const colors = ["#0f766e", "#2563eb", "#db2777", "#7c3aed", "#ea580c", "#0891b2"];
  return {
    userId: globalThis.crypto?.randomUUID?.() ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    displayName: `User ${Math.floor(1000 + Math.random() * 9000)}`,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

export function subscribeToBoardIdChanges(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("sketchflow:boardidchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("sketchflow:boardidchange", callback);
  };
}

export function getBoardIdFromLocation() {
  const boardId = new URLSearchParams(window.location.search).get("boardId")?.trim() || "";
  return boardId.length <= 128 && !/[\u0000-\u001f\u007f]/.test(boardId) ? boardId : "";
}
