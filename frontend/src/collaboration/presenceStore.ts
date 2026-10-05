import type { Point } from "@/types/geometry";
import type { Viewport } from "@/types/geometry";

export type Collaborator = {
  userId: string;
  displayName: string;
  color: string;
};

export type CollaborationConnectionState = "connecting" | "connected" | "reconnecting" | "offline";

export type RemoteCursor = Point & { userId: string; updatedAt: number };

type PresenceSnapshot = {
  boardId: string | null;
  localUser: Collaborator | null;
  connected: boolean;
  connectionState: CollaborationConnectionState;
  users: Record<string, Collaborator>;
};

type CursorSnapshot = Record<string, RemoteCursor>;

let presenceSnapshot: PresenceSnapshot = {
  boardId: null,
  localUser: null,
  connected: false,
  connectionState: "offline",
  users: {},
};
let cursorSnapshot: CursorSnapshot = {};
let viewportSnapshot: Viewport = { offsetX: 0, offsetY: 0, scale: 1 };
const presenceSubscribers = new Set<() => void>();
const cursorSubscribers = new Set<() => void>();
const viewportSubscribers = new Set<() => void>();

function notify(subscribers: Set<() => void>) {
  subscribers.forEach((subscriber) => subscriber());
}

export function subscribePresence(subscriber: () => void) {
  presenceSubscribers.add(subscriber);
  return () => presenceSubscribers.delete(subscriber);
}

export function subscribeCursors(subscriber: () => void) {
  cursorSubscribers.add(subscriber);
  return () => cursorSubscribers.delete(subscriber);
}

export function subscribeViewport(subscriber: () => void) {
  viewportSubscribers.add(subscriber);
  return () => viewportSubscribers.delete(subscriber);
}

export function getPresenceSnapshot() {
  return presenceSnapshot;
}

export function getCursorSnapshot() {
  return cursorSnapshot;
}

export function getViewportSnapshot() {
  return viewportSnapshot;
}

export function startPresence(boardId: string, localUser: Collaborator) {
  presenceSnapshot = { boardId, localUser, connected: false, connectionState: "connecting", users: {} };
  cursorSnapshot = {};
  notify(presenceSubscribers);
  notify(cursorSubscribers);
}

export function clearPresence() {
  presenceSnapshot = { boardId: null, localUser: null, connected: false, connectionState: "offline", users: {} };
  cursorSnapshot = {};
  notify(presenceSubscribers);
  notify(cursorSubscribers);
}

export function setPresenceConnected(connected: boolean) {
  const connectionState = connected ? "connected" : "reconnecting";
  if (presenceSnapshot.connected === connected && presenceSnapshot.connectionState === connectionState) return;
  presenceSnapshot = { ...presenceSnapshot, connected, connectionState };
  notify(presenceSubscribers);
}

export function setPresenceConnectionState(connectionState: CollaborationConnectionState) {
  const connected = connectionState === "connected";
  if (presenceSnapshot.connectionState === connectionState && presenceSnapshot.connected === connected) return;
  presenceSnapshot = { ...presenceSnapshot, connected, connectionState };
  notify(presenceSubscribers);
}

export function addCollaborator(boardId: string, user: Collaborator) {
  if (presenceSnapshot.boardId !== boardId || user.userId === presenceSnapshot.localUser?.userId) return;
  presenceSnapshot = { ...presenceSnapshot, users: { ...presenceSnapshot.users, [user.userId]: user } };
  notify(presenceSubscribers);
}

export function removeCollaborator(boardId: string, userId: string) {
  if (presenceSnapshot.boardId !== boardId || !presenceSnapshot.users[userId]) return;
  const users = { ...presenceSnapshot.users };
  delete users[userId];
  presenceSnapshot = { ...presenceSnapshot, users };
  notify(presenceSubscribers);
  removeCursor(userId);
}

export function setRemoteCursor(boardId: string, cursor: RemoteCursor) {
  if (presenceSnapshot.boardId !== boardId || cursor.userId === presenceSnapshot.localUser?.userId) return;
  cursorSnapshot = { ...cursorSnapshot, [cursor.userId]: cursor };
  notify(cursorSubscribers);
}

export function removeCursor(userId: string) {
  if (!cursorSnapshot[userId]) return;
  const cursors = { ...cursorSnapshot };
  delete cursors[userId];
  cursorSnapshot = cursors;
  notify(cursorSubscribers);
}

export function clearStaleCursors(now = Date.now(), maxAgeMs = 15_000) {
  const fresh = Object.fromEntries(Object.entries(cursorSnapshot).filter(([, cursor]) => now - cursor.updatedAt < maxAgeMs));
  if (Object.keys(fresh).length !== Object.keys(cursorSnapshot).length) {
    cursorSnapshot = fresh;
    notify(cursorSubscribers);
  }
}

export function setLocalViewport(viewport: Viewport) {
  viewportSnapshot = viewport;
  notify(viewportSubscribers);
}
