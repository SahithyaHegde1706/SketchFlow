export type BoardSummary = { id: string; name: string };

export function getBackendUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";
}

export function boardSharePath(boardId: string) {
  return `/board?boardId=${encodeURIComponent(boardId)}`;
}

export async function createBoard(): Promise<{ board: BoardSummary; path: string }> {
  const response = await fetch(`${getBackendUrl()}/api/boards`, { method: "POST" });
  if (!response.ok) throw new Error("Could not create board");
  return response.json() as Promise<{ board: BoardSummary; path: string }>;
}
