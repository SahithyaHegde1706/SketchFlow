export type RemoteSelection = {
  userId: string;
  selectedElementIds: string[];
};

type SelectionSnapshot = {
  boardId: string | null;
  users: Record<string, RemoteSelection>;
};

let snapshot: SelectionSnapshot = { boardId: null, users: {} };
const subscribers = new Set<() => void>();

function notify() {
  subscribers.forEach((subscriber) => subscriber());
}

export function subscribeSelections(subscriber: () => void) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function getSelectionSnapshot() {
  return snapshot;
}

export function startRemoteSelections(boardId: string) {
  snapshot = { boardId, users: {} };
  notify();
}

export function clearRemoteSelections() {
  snapshot = { boardId: null, users: {} };
  notify();
}

export function setRemoteSelection(boardId: string, userId: string, selectedElementIds: string[]) {
  if (snapshot.boardId !== boardId) return;
  snapshot = {
    ...snapshot,
    users: {
      ...snapshot.users,
      [userId]: { userId, selectedElementIds: [...new Set(selectedElementIds)] },
    },
  };
  notify();
}

export function removeRemoteSelection(boardId: string, userId: string) {
  if (snapshot.boardId !== boardId || !snapshot.users[userId]) return;
  const users = { ...snapshot.users };
  delete users[userId];
  snapshot = { ...snapshot, users };
  notify();
}

export function removeDeletedElementFromSelections(boardId: string, elementId: string) {
  if (snapshot.boardId !== boardId) return;
  let changed = false;
  const users = Object.fromEntries(Object.entries(snapshot.users).map(([userId, selection]) => {
    const selectedElementIds = selection.selectedElementIds.filter((id) => id !== elementId);
    if (selectedElementIds.length !== selection.selectedElementIds.length) changed = true;
    return [userId, selectedElementIds.length === selection.selectedElementIds.length
      ? selection
      : { ...selection, selectedElementIds }];
  }));
  if (changed) {
    snapshot = { ...snapshot, users };
    notify();
  }
}

export function pruneRemoteSelections(boardId: string, existingElementIds: Set<string>) {
  if (snapshot.boardId !== boardId) return;
  let changed = false;
  const users = Object.fromEntries(Object.entries(snapshot.users).map(([userId, selection]) => {
    const selectedElementIds = selection.selectedElementIds.filter((id) => existingElementIds.has(id));
    if (selectedElementIds.length !== selection.selectedElementIds.length) changed = true;
    return [userId, selectedElementIds.length === selection.selectedElementIds.length
      ? selection
      : { ...selection, selectedElementIds }];
  }));
  if (changed) {
    snapshot = { ...snapshot, users };
    notify();
  }
}
