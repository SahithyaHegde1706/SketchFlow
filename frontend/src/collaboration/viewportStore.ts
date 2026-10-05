import type { Viewport } from "@/types/geometry";

export type RemoteViewport = {
  userId: string;
  viewport: Viewport;
  updatedAt: number;
};

type ViewportSnapshot = {
  boardId: string | null;
  users: Record<string, RemoteViewport>;
};

let snapshot: ViewportSnapshot = { boardId: null, users: {} };
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((subscriber) => subscriber());
}

export function subscribeRemoteViewports(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function getRemoteViewportSnapshot() {
  return snapshot;
}

export function startRemoteViewports(boardId: string) {
  snapshot = { boardId, users: {} };
  notify();
}

export function clearRemoteViewports() {
  snapshot = { boardId: null, users: {} };
  notify();
}

export function setRemoteViewport(boardId: string, userId: string, viewport: Viewport) {
  if (snapshot.boardId !== boardId || !userId) return;
  if (![viewport.offsetX, viewport.offsetY, viewport.scale].every(Number.isFinite)
    || Math.abs(viewport.offsetX) > 1_000_000
    || Math.abs(viewport.offsetY) > 1_000_000
    || viewport.scale < 0.25
    || viewport.scale > 4) return;

  snapshot = {
    ...snapshot,
    users: {
      ...snapshot.users,
      [userId]: { userId, viewport: { ...viewport }, updatedAt: Date.now() },
    },
  };
  notify();
}

export function removeRemoteViewport(boardId: string, userId: string) {
  if (snapshot.boardId !== boardId || !snapshot.users[userId]) return;
  const users = { ...snapshot.users };
  delete users[userId];
  snapshot = { ...snapshot, users };
  notify();
}
