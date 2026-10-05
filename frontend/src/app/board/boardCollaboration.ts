import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import type { BoardCanvasHandle } from "@/components/board/canvas/BoardCanvas";
import type { Collaborator } from "@/collaboration/presenceStore";
import type { Point, Viewport } from "@/types/geometry";
import type { FreehandStroke, WhiteboardElement } from "@/types/canvas";
import {
  addCollaborator,
  clearPresence,
  removeCollaborator,
  setPresenceConnectionState,
  setPresenceConnected,
  setRemoteCursor,
  startPresence,
  getViewportSnapshot,
} from "@/collaboration/presenceStore";
import {
  removeDeletedElementFromSelections,
  removeRemoteSelection,
  setRemoteSelection,
  startRemoteSelections,
  clearRemoteSelections,
} from "@/collaboration/selectionStore";
import {
  setRemoteViewport,
  startRemoteViewports,
  clearRemoteViewports,
  removeRemoteViewport,
} from "@/collaboration/viewportStore";
import type { CanvasSettings } from "@/types/canvas";
import {
  isUserPresencePayload,
  isUserLeftPayload,
  isCursorMovedPayload,
  isSelectionChangedPayload,
  isViewportChangedPayload,
  isCanvasSettingsPayload,
  isElementCreatedPayload,
  isElementDeletedPayload,
  isFreehandCreatedPayload,
  isTextContentUpdatedPayload,
} from "./boardValidation";
import { getBackendUrl } from "@/collaboration/boards";
import type { RefObject, MutableRefObject } from "react";

export interface CollaborationCallbacks {
  onRemoteSettingsUpdate: (settings: CanvasSettings) => void;
  onPersistenceError: () => void;
}

export interface CollaborationRefs {
  boardRef: RefObject<BoardCanvasHandle | null>;
  socketRef: MutableRefObject<Socket | null>;
  collaboratorRef: MutableRefObject<Collaborator | null>;
  pendingCursorRef: MutableRefObject<Point | null>;
  cursorTimerRef: MutableRefObject<number | null>;
  pendingViewportRef: MutableRefObject<Viewport | null>;
  viewportTimerRef: MutableRefObject<number | null>;
  lastBroadcastViewportRef: MutableRefObject<string | null>;
  lastBroadcastSelectionSignatureRef: MutableRefObject<string | null>;
  remoteSettingsSignatureRef: MutableRefObject<string | null>;
  boardIdRef: MutableRefObject<string>;
}

export function broadcastElementCreated(
  refs: CollaborationRefs,
  element: WhiteboardElement,
) {
  const socket = refs.socketRef.current;
  if (socket?.connected) {
    socket.emit("element-created", { boardId: refs.boardIdRef.current, element });
  }
}

export function broadcastElementUpdated(
  refs: CollaborationRefs,
  element: WhiteboardElement,
) {
  const socket = refs.socketRef.current;
  if (socket?.connected) {
    socket.emit("element-updated", { boardId: refs.boardIdRef.current, element });
  }
}

export function broadcastElementDeleted(
  refs: CollaborationRefs,
  elementId: string,
) {
  const socket = refs.socketRef.current;
  if (socket?.connected) {
    socket.emit("element-deleted", { boardId: refs.boardIdRef.current, elementId });
  }
}

export function broadcastFreehandCreated(
  refs: CollaborationRefs,
  stroke: FreehandStroke,
  strokeIndex?: number,
  creationOrderIndex?: number,
) {
  const socket = refs.socketRef.current;
  if (socket?.connected) {
    socket.emit("freehand-created", { boardId: refs.boardIdRef.current, stroke, strokeIndex, creationOrderIndex });
  }
}

export function broadcastFreehandDeleted(
  refs: CollaborationRefs,
  stroke: FreehandStroke,
  strokeIndex?: number,
  creationOrderIndex?: number,
) {
  const socket = refs.socketRef.current;
  if (socket?.connected) {
    socket.emit("freehand-deleted", { boardId: refs.boardIdRef.current, stroke, strokeIndex, creationOrderIndex });
  }
}

export function broadcastTextContentUpdated(
  refs: CollaborationRefs,
  elementId: string,
  text: string,
) {
  const socket = refs.socketRef.current;
  if (socket?.connected) {
    socket.emit("text-content-updated", { boardId: refs.boardIdRef.current, elementId, text });
  }
}

export function broadcastCursor(
  refs: CollaborationRefs,
  point: Point,
) {
  const { socketRef, collaboratorRef, pendingCursorRef, cursorTimerRef, boardIdRef } = refs;
  pendingCursorRef.current = point;
  if (cursorTimerRef.current !== null) return;
  cursorTimerRef.current = window.setTimeout(() => {
    cursorTimerRef.current = null;
    const latestPoint = pendingCursorRef.current;
    pendingCursorRef.current = null;
    const socket = socketRef.current;
    const user = collaboratorRef.current;
    if (latestPoint && user && socket?.connected) {
      socket.emit("cursor-moved", { boardId: boardIdRef.current, userId: user.userId, ...latestPoint });
    }
  }, 50);
}

export function broadcastSelection(
  refs: CollaborationRefs,
  selectedElementIds: string[],
) {
  const { socketRef, collaboratorRef, lastBroadcastSelectionSignatureRef, boardIdRef } = refs;
  const socket = socketRef.current;
  const identity = collaboratorRef.current;
  const signature = JSON.stringify(selectedElementIds);
  if (!socket?.connected || !identity || lastBroadcastSelectionSignatureRef.current === signature) return;
  socket.emit("selection-changed", {
    boardId: boardIdRef.current,
    userId: identity.userId,
    selectedElementIds,
  });
  lastBroadcastSelectionSignatureRef.current = signature;
}

export function broadcastViewport(
  refs: CollaborationRefs,
  viewport: Viewport,
) {
  const { socketRef, collaboratorRef, pendingViewportRef, viewportTimerRef, lastBroadcastViewportRef, boardIdRef } = refs;
  pendingViewportRef.current = viewport;
  if (viewportTimerRef.current !== null) return;
  viewportTimerRef.current = window.setTimeout(() => {
    viewportTimerRef.current = null;
    const latestViewport = pendingViewportRef.current;
    pendingViewportRef.current = null;
    const socket = socketRef.current;
    const identity = collaboratorRef.current;
    const signature = latestViewport ? JSON.stringify(latestViewport) : null;
    if (!latestViewport || !identity || !socket?.connected || signature === lastBroadcastViewportRef.current) return;

    socket.emit("viewport-changed", {
      boardId: boardIdRef.current,
      userId: identity.userId,
      viewport: latestViewport,
    });
    lastBroadcastViewportRef.current = signature;
  }, 100);
}

export function setupCollaboration(
  boardId: string,
  identity: Collaborator,
  refs: CollaborationRefs,
  localSelectionIdsRef: React.MutableRefObject<string[]>,
  callbacks: CollaborationCallbacks,
): () => void {
  const { boardRef, socketRef, collaboratorRef, cursorTimerRef, viewportTimerRef, remoteSettingsSignatureRef } = refs;
  const { onRemoteSettingsUpdate, onPersistenceError } = callbacks;

  collaboratorRef.current = identity;
  refs.lastBroadcastSelectionSignatureRef.current = null;
  refs.lastBroadcastViewportRef.current = null;
  refs.boardIdRef.current = boardId;
  startPresence(boardId, identity);
  startRemoteSelections(boardId);
  startRemoteViewports(boardId);

  const socket = io(getBackendUrl(), {
    autoConnect: false,
  });
  let hasConnected = false;
  let isCleaningUp = false;

  const joinBoard = () => {
    hasConnected = true;
    setPresenceConnected(true);
    socket.emit("join-board", { boardId, user: identity });
    broadcastSelection(refs, localSelectionIdsRef.current);
    broadcastViewport(refs, getViewportSnapshot());
  };

  const handleDisconnect = (reason: string) => {
    refs.lastBroadcastSelectionSignatureRef.current = null;
    refs.lastBroadcastViewportRef.current = null;
    startPresence(boardId, identity);
    setPresenceConnectionState(hasConnected ? "reconnecting" : "connecting");
    startRemoteSelections(boardId);
    startRemoteViewports(boardId);
    if (!isCleaningUp && reason === "io server disconnect") {
      socket.connect();
    }
  };

  const handleReconnectAttempt = () => setPresenceConnectionState("reconnecting");
  const handleReconnectFailed = () => setPresenceConnectionState("offline");

  const receiveUserPresence = (payload: unknown) => {
    if (!isUserPresencePayload(payload) || payload.boardId !== boardId) return;
    addCollaborator(boardId, payload.user);
  };

  const receiveUserLeft = (payload: unknown) => {
    if (!isUserLeftPayload(payload) || payload.boardId !== boardId) return;
    removeCollaborator(boardId, payload.userId);
    removeRemoteSelection(boardId, payload.userId);
    removeRemoteViewport(boardId, payload.userId);
  };

  const receiveCursor = (payload: unknown) => {
    if (!isCursorMovedPayload(payload) || payload.boardId !== boardId || payload.userId === identity.userId) return;
    setRemoteCursor(boardId, { ...payload, updatedAt: Date.now() });
  };

  const receiveCreatedElement = (payload: unknown) => {
    if (!isElementCreatedPayload(payload) || payload.boardId !== boardId) return;
    boardRef.current?.addRemoteElement(payload.element);
  };

  const receiveUpdatedElement = (payload: unknown) => {
    if (!isElementCreatedPayload(payload) || payload.boardId !== boardId) return;
    boardRef.current?.applyRemoteElementUpdate(payload.element);
  };

  const receiveDeletedElement = (payload: unknown) => {
    if (!isElementDeletedPayload(payload) || payload.boardId !== boardId) return;
    removeDeletedElementFromSelections(boardId, payload.elementId);
    boardRef.current?.deleteRemoteElement(payload.elementId);
  };

  const receiveSelection = (payload: unknown) => {
    if (!isSelectionChangedPayload(payload) || payload.boardId !== boardId || payload.userId === identity.userId) return;
    setRemoteSelection(boardId, payload.userId, payload.selectedElementIds);
  };

  const receiveViewport = (payload: unknown) => {
    if (!isViewportChangedPayload(payload) || payload.boardId !== boardId || payload.userId === identity.userId) return;
    setRemoteViewport(boardId, payload.userId, payload.viewport);
  };

  const receiveFreehandStroke = (payload: unknown) => {
    if (!isFreehandCreatedPayload(payload) || payload.boardId !== boardId) return;
    boardRef.current?.addRemoteStroke(payload.stroke, payload.strokeIndex, payload.creationOrderIndex);
  };

  const receiveFreehandDeletion = (payload: unknown) => {
    if (!isFreehandCreatedPayload(payload) || payload.boardId !== boardId) return;
    boardRef.current?.deleteRemoteStroke(payload.stroke, payload.strokeIndex);
  };

  const receiveTextContentUpdate = (payload: unknown) => {
    if (!isTextContentUpdatedPayload(payload) || payload.boardId !== boardId) return;
    boardRef.current?.updateRemoteTextContent(payload.elementId, payload.text);
  };

  const receiveCanvasSettingsUpdate = (payload: unknown) => {
    if (!isCanvasSettingsPayload(payload) || payload.boardId !== boardId) return;
    remoteSettingsSignatureRef.current = JSON.stringify(payload.canvasSettings);
    onRemoteSettingsUpdate(payload.canvasSettings);
  };

  const receivePersistenceError = (payload: unknown) => {
    if (typeof payload === "object" && payload !== null && "boardId" in payload && payload.boardId === boardId) {
      onPersistenceError();
    }
  };

  socket.on("connect", joinBoard);
  socket.on("disconnect", handleDisconnect);
  socket.on("connect_error", handleReconnectAttempt);
  socket.io.on("reconnect_attempt", handleReconnectAttempt);
  socket.io.on("reconnect_failed", handleReconnectFailed);
  socket.on("user-presence", receiveUserPresence);
  socket.on("user-left", receiveUserLeft);
  socket.on("cursor-moved", receiveCursor);
  socket.on("selection-changed", receiveSelection);
  socket.on("viewport-changed", receiveViewport);
  socket.on("element-created", receiveCreatedElement);
  socket.on("element-updated", receiveUpdatedElement);
  socket.on("element-deleted", receiveDeletedElement);
  socket.on("freehand-created", receiveFreehandStroke);
  socket.on("freehand-deleted", receiveFreehandDeletion);
  socket.on("text-content-updated", receiveTextContentUpdate);
  socket.on("canvas-settings-updated", receiveCanvasSettingsUpdate);
  socket.on("board-persistence-error", receivePersistenceError);
  socketRef.current = socket;
  socket.connect();

  return () => {
    socket.off("connect", joinBoard);
    socket.off("disconnect", handleDisconnect);
    socket.off("connect_error", handleReconnectAttempt);
    socket.io.off("reconnect_attempt", handleReconnectAttempt);
    socket.io.off("reconnect_failed", handleReconnectFailed);
    isCleaningUp = true;
    socket.off("user-presence", receiveUserPresence);
    socket.off("user-left", receiveUserLeft);
    socket.off("cursor-moved", receiveCursor);
    socket.off("selection-changed", receiveSelection);
    socket.off("viewport-changed", receiveViewport);
    socket.off("element-created", receiveCreatedElement);
    socket.off("element-updated", receiveUpdatedElement);
    socket.off("element-deleted", receiveDeletedElement);
    socket.off("freehand-created", receiveFreehandStroke);
    socket.off("freehand-deleted", receiveFreehandDeletion);
    socket.off("text-content-updated", receiveTextContentUpdate);
    socket.off("canvas-settings-updated", receiveCanvasSettingsUpdate);
    socket.off("board-persistence-error", receivePersistenceError);
    if (socket.connected) socket.emit("leave-board", { boardId });
    socket.disconnect();
    if (cursorTimerRef.current !== null) window.clearTimeout(cursorTimerRef.current);
    if (viewportTimerRef.current !== null) window.clearTimeout(viewportTimerRef.current);
    cursorTimerRef.current = null;
    viewportTimerRef.current = null;
    refs.pendingCursorRef.current = null;
    refs.pendingViewportRef.current = null;
    collaboratorRef.current = null;
    clearPresence();
    clearRemoteSelections();
    clearRemoteViewports();
    if (socketRef.current === socket) socketRef.current = null;
  };
}
