"use client";

import { useRef, useState, useEffect, useMemo, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { BoardCanvas, type BoardCanvasHandle } from "@/components/board/canvas/BoardCanvas";
import { BoardHeader } from "@/components/board/header/BoardHeader";
import { ToolRail } from "@/components/board/toolbar/ToolRail";
import { LayersPanel } from "@/components/board/layers/LayersPanel";
import { PropertiesPanel } from "@/components/board/properties/PropertiesPanel";
import { CanvasSettingsPanel } from "@/components/board/properties/CanvasSettingsPanel";
import { saveToLocalStorage, createDebouncedAutosave } from "@/document/autosave";
import { createDefaultCanvasSettings, DEFAULT_DOCUMENT_NAME, isDefaultDocumentBackground } from "@/document/defaults";
import { createBoard, getBackendUrl } from "@/collaboration/boards";
import { isValidDocument } from "@/document/autosave/validation";
import type { SketchFlowDocumentV1 } from "@/document/types";
import { useTheme } from "@/components/ThemeProvider";
import { io, type Socket } from "socket.io-client";
import type { Point, Viewport } from "@/types/geometry";
import {
  addCollaborator,
  clearPresence,
  removeCollaborator,
  setPresenceConnectionState,
  setPresenceConnected,
  setRemoteCursor,
  startPresence,
  type Collaborator,
} from "@/collaboration/presenceStore";
import {
  clearRemoteSelections,
  removeDeletedElementFromSelections,
  removeRemoteSelection,
  setRemoteSelection,
  startRemoteSelections,
} from "@/collaboration/selectionStore";
import { flattenSelection } from "@/components/board/canvas/selection";
import {
  clearRemoteViewports,
  removeRemoteViewport,
  setRemoteViewport,
  startRemoteViewports,
} from "@/collaboration/viewportStore";
import { getViewportSnapshot } from "@/collaboration/presenceStore";

import type { Tool, SelectionSet } from "@/types/editor";
import type { CreationRecord, FreehandStroke, Group, CanvasSettings, WhiteboardElement } from "@/types/canvas";

type ElementCreatedPayload = { boardId: string; element: WhiteboardElement };
type ElementDeletedPayload = { boardId: string; elementId: string };
type FreehandCreatedPayload = { boardId: string; stroke: FreehandStroke; strokeIndex?: number; creationOrderIndex?: number };
type TextContentUpdatedPayload = { boardId: string; elementId: string; text: string };
type UserPresencePayload = { boardId: string; user: Collaborator };
type UserLeftPayload = { boardId: string; userId: string };
type CursorMovedPayload = { boardId: string; userId: string; x: number; y: number };
type SelectionChangedPayload = { boardId: string; userId: string; selectedElementIds: string[] };
type ViewportChangedPayload = { boardId: string; userId: string; viewport: Viewport };

function isCollaborator(value: unknown): value is Collaborator {
  return typeof value === "object" && value !== null
    && "userId" in value && typeof value.userId === "string" && value.userId.length > 0
    && "displayName" in value && typeof value.displayName === "string"
    && "color" in value && typeof value.color === "string" && /^#[0-9a-fA-F]{6}$/.test(value.color);
}

function isUserPresencePayload(payload: unknown): payload is UserPresencePayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "user" in payload && isCollaborator(payload.user);
}

function isUserLeftPayload(payload: unknown): payload is UserLeftPayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "userId" in payload && typeof payload.userId === "string";
}

function isCursorMovedPayload(payload: unknown): payload is CursorMovedPayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "userId" in payload && typeof payload.userId === "string"
    && "x" in payload && typeof payload.x === "number" && Number.isFinite(payload.x)
    && "y" in payload && typeof payload.y === "number" && Number.isFinite(payload.y);
}

function isSelectionChangedPayload(payload: unknown): payload is SelectionChangedPayload {
  return typeof payload === "object" && payload !== null
    && "boardId" in payload && typeof payload.boardId === "string"
    && "userId" in payload && typeof payload.userId === "string" && payload.userId.length > 0
    && "selectedElementIds" in payload && Array.isArray(payload.selectedElementIds)
    && payload.selectedElementIds.length <= 500
    && payload.selectedElementIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 128);
}

function isViewportChangedPayload(payload: unknown): payload is ViewportChangedPayload {
  if (typeof payload !== "object" || payload === null
    || !("boardId" in payload) || typeof payload.boardId !== "string"
    || !("userId" in payload) || typeof payload.userId !== "string"
    || !("viewport" in payload) || typeof payload.viewport !== "object" || payload.viewport === null) return false;
  const viewport = payload.viewport;
  return "offsetX" in viewport && typeof viewport.offsetX === "number" && Number.isFinite(viewport.offsetX)
    && "offsetY" in viewport && typeof viewport.offsetY === "number" && Number.isFinite(viewport.offsetY)
    && "scale" in viewport && typeof viewport.scale === "number" && Number.isFinite(viewport.scale)
    && Math.abs(viewport.offsetX) <= 1_000_000
    && Math.abs(viewport.offsetY) <= 1_000_000
    && viewport.scale >= 0.25 && viewport.scale <= 4;
}

function getSelectedElementIds(selections: SelectionSet, records: CreationRecord[]) {
  const elements = records.flatMap((record) => record.kind === "element" ? [record.value] : []);
  return [...new Set(flattenSelection(selections, elements)
    .flatMap((selection) => selection.kind === "element" ? [selection.value.id] : []))].sort();
}

function createCollaborator(): Collaborator {
  const colors = ["#0f766e", "#2563eb", "#db2777", "#7c3aed", "#ea580c", "#0891b2"];
  return {
    userId: globalThis.crypto?.randomUUID?.() ?? `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    displayName: `User ${Math.floor(1000 + Math.random() * 9000)}`,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

function subscribeToBoardIdChanges(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener("sketchflow:boardidchange", callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener("sketchflow:boardidchange", callback);
  };
}

function getBoardIdFromLocation() {
  const boardId = new URLSearchParams(window.location.search).get("boardId")?.trim() || "";
  return boardId.length <= 128 && !/[\u0000-\u001f\u007f]/.test(boardId) ? boardId : "";
}

function isCanvasSettingsPayload(payload: unknown): payload is { boardId: string; canvasSettings: CanvasSettings } {
  if (typeof payload !== "object" || payload === null || !("boardId" in payload) || typeof payload.boardId !== "string" || !("canvasSettings" in payload)) return false;
  const settings = payload.canvasSettings;
  return typeof settings === "object" && settings !== null && !Array.isArray(settings)
    && "backgroundColor" in settings && typeof settings.backgroundColor === "string"
    && "showGrid" in settings && typeof settings.showGrid === "boolean"
    && "gridSize" in settings && typeof settings.gridSize === "number" && Number.isFinite(settings.gridSize)
    && "snapSettings" in settings && typeof settings.snapSettings === "object" && settings.snapSettings !== null;
}

function isElementCreatedPayload(payload: unknown): payload is ElementCreatedPayload {
  if (typeof payload !== "object" || payload === null || !("boardId" in payload) || !("element" in payload)) {
    return false;
  }

  const element = payload.element;
  return typeof payload.boardId === "string"
    && typeof element === "object"
    && element !== null
    && "id" in element
    && typeof element.id === "string"
    && "type" in element
    && ["rectangle", "roundedRectangle", "circle", "arrow", "line", "text", "image"].includes(String(element.type));
}

function isElementDeletedPayload(payload: unknown): payload is ElementDeletedPayload {
  return typeof payload === "object"
    && payload !== null
    && "boardId" in payload
    && typeof payload.boardId === "string"
    && "elementId" in payload
    && typeof payload.elementId === "string";
}

function isFreehandCreatedPayload(payload: unknown): payload is FreehandCreatedPayload {
  if (typeof payload !== "object" || payload === null || !("boardId" in payload) || !("stroke" in payload)) {
    return false;
  }

  const stroke = payload.stroke;
  return typeof payload.boardId === "string"
    && Array.isArray(stroke)
    && stroke.length > 0
    && stroke.every((point) => typeof point === "object"
      && point !== null
      && "x" in point
      && typeof point.x === "number"
      && Number.isFinite(point.x)
      && "y" in point
      && typeof point.y === "number"
      && Number.isFinite(point.y))
    && (!(("strokeIndex" in payload) && payload.strokeIndex !== undefined)
      || (Number.isSafeInteger(payload.strokeIndex) && Number(payload.strokeIndex) >= 0))
    && (!(("creationOrderIndex" in payload) && payload.creationOrderIndex !== undefined)
      || (Number.isSafeInteger(payload.creationOrderIndex) && Number(payload.creationOrderIndex) >= 0));
}

function isTextContentUpdatedPayload(payload: unknown): payload is TextContentUpdatedPayload {
  return typeof payload === "object"
    && payload !== null
    && "boardId" in payload
    && typeof payload.boardId === "string"
    && "elementId" in payload
    && typeof payload.elementId === "string"
    && "text" in payload
    && typeof payload.text === "string";
}

export default function BoardPage() {
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activePanel, setActivePanel] = useState<"layers" | "properties" | "canvas-settings" | null>(null);
  const [documentState, setDocumentState] = useState({
    records: [] as CreationRecord[],
    groups: [] as Group[],
    selections: [] as SelectionSet
  });
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const [persistenceFailed, setPersistenceFailed] = useState(false);
  const [isDocumentRestoring, setIsDocumentRestoring] = useState(true);
  const [loadedBoard, setLoadedBoard] = useState<{ id: string; status: "ready" | "not-found" | "error" }>({ id: "", status: "not-found" });
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);
  const [boardCreationError, setBoardCreationError] = useState(false);
  const boardId = useSyncExternalStore(subscribeToBoardIdChanges, getBoardIdFromLocation, () => "");
  const boardLoadState = !boardId ? "not-found" : loadedBoard.id === boardId ? loadedBoard.status : "loading";
  const [storedCanvasSettings, setCanvasSettings] = useState<CanvasSettings>(() => createDefaultCanvasSettings(theme));
  const canvasSettings = useMemo(() => {
    if (storedCanvasSettings.backgroundMode !== "custom") {
      return {
        ...storedCanvasSettings,
        backgroundMode: "theme-default" as const,
        backgroundColor: createDefaultCanvasSettings(theme).backgroundColor,
      };
    }

    return storedCanvasSettings;
  }, [storedCanvasSettings, theme]);
  const [boardName, setBoardName] = useState(DEFAULT_DOCUMENT_NAME);
  const boardRef = useRef<BoardCanvasHandle>(null);
  const socketRef = useRef<Socket | null>(null);
  const boardIdRef = useRef("");
  const restoreGenerationRef = useRef(0);
  const persistenceStateRef = useRef({ canvasSettings, boardName });
  const persistenceInputsMounted = useRef(false);
  const pendingCursorRef = useRef<Point | null>(null);
  const cursorTimerRef = useRef<number | null>(null);
  const collaboratorRef = useRef<Collaborator | null>(null);
  const pendingViewportRef = useRef<Viewport | null>(null);
  const viewportTimerRef = useRef<number | null>(null);
  const lastBroadcastViewportRef = useRef<string | null>(null);
  const localSelectionIdsRef = useRef<string[]>([]);
  const lastBroadcastSelectionSignatureRef = useRef<string | null>(null);
  const remoteSettingsSignatureRef = useRef<string | null>(null);

  const broadcastElementCreated = useCallback((element: WhiteboardElement) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("element-created", { boardId: boardIdRef.current, element });
    }
  }, []);

  const broadcastElementUpdated = useCallback((element: WhiteboardElement) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("element-updated", { boardId: boardIdRef.current, element });
    }
  }, []);

  const broadcastElementDeleted = useCallback((elementId: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("element-deleted", { boardId: boardIdRef.current, elementId });
    }
  }, []);

  const broadcastFreehandCreated = useCallback((stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("freehand-created", { boardId: boardIdRef.current, stroke, strokeIndex, creationOrderIndex });
    }
  }, []);

  const broadcastFreehandDeleted = useCallback((stroke: FreehandStroke, strokeIndex?: number, creationOrderIndex?: number) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("freehand-deleted", { boardId: boardIdRef.current, stroke, strokeIndex, creationOrderIndex });
    }
  }, []);

  const broadcastTextContentUpdated = useCallback((elementId: string, text: string) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("text-content-updated", { boardId: boardIdRef.current, elementId, text });
    }
  }, []);

  const broadcastCursor = useCallback((point: Point) => {
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
  }, []);

  const broadcastSelection = useCallback((selectedElementIds: string[]) => {
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
  }, []);

  const broadcastViewport = useCallback((viewport: Viewport) => {
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
  }, []);

  const persistDocument = useCallback(async (
    strokes: Parameters<typeof saveToLocalStorage>[0],
    elements: Parameters<typeof saveToLocalStorage>[1],
    groups: Parameters<typeof saveToLocalStorage>[2],
    creationOrder: Parameters<typeof saveToLocalStorage>[3],
    settings: CanvasSettings,
    name: string,
  ) => {
    const saved = await saveToLocalStorage(strokes, elements, groups, creationOrder, settings, name);
    setPersistenceFailed(!saved);
  }, []);

  useEffect(() => {
    if (isDocumentRestoring || boardLoadState !== "ready" || !boardId) return;

    const identity = createCollaborator();
    collaboratorRef.current = identity;
    lastBroadcastSelectionSignatureRef.current = null;
    lastBroadcastViewportRef.current = null;
    boardIdRef.current = boardId;
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
      broadcastSelection(localSelectionIdsRef.current);
      broadcastViewport(getViewportSnapshot());
    };
    const handleDisconnect = (reason: string) => {
      lastBroadcastSelectionSignatureRef.current = null;
      lastBroadcastViewportRef.current = null;
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
      setCanvasSettings(payload.canvasSettings);
    };
    const receivePersistenceError = (payload: unknown) => {
      if (typeof payload === "object" && payload !== null && "boardId" in payload && payload.boardId === boardId) {
        setPersistenceFailed(true);
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
      pendingCursorRef.current = null;
      pendingViewportRef.current = null;
      collaboratorRef.current = null;
      clearPresence();
      clearRemoteSelections();
      clearRemoteViewports();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [boardId, boardLoadState, broadcastSelection, broadcastViewport, isDocumentRestoring]);

  // Keep one debouncer so rapid document, settings, and name changes share a timer.
  const debouncedAutosave = useRef<(() => void) | null>(null);
  useEffect(() => {
    debouncedAutosave.current = createDebouncedAutosave(async () => {
      if (boardRef.current) {
        const docState = boardRef.current.getDocumentState();
        const latest = persistenceStateRef.current;
        await persistDocument(
          docState.strokes,
          docState.elements,
          docState.groups,
          docState.creationOrder,
          latest.canvasSettings,
          latest.boardName
        );
      }
    });
  }, [persistDocument]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Load the selected board before opening its collaboration room.
  useEffect(() => {
    let active = true;
    const generation = ++restoreGenerationRef.current;
    if (!boardId) return () => { active = false; };

    void (async () => {
      try {
        const response = await fetch(`${getBackendUrl()}/api/boards/${encodeURIComponent(boardId)}`, { cache: "no-store" });
        if (!active || generation !== restoreGenerationRef.current) return;
        if (response.status === 404) {
          setLoadedBoard({ id: boardId, status: "not-found" });
          return;
        }
        if (!response.ok) throw new Error("Board service is unavailable");
        const result = await response.json() as { board?: { id?: unknown; name?: unknown; document?: unknown } };
        if (!result.board || result.board.id !== boardId || !isValidDocument(result.board.document)) {
          setLoadedBoard({ id: boardId, status: "not-found" });
          return;
        }
        const savedDocument = result.board.document as SketchFlowDocumentV1;
        if (!active || generation !== restoreGenerationRef.current) return;
        boardRef.current?.restoreDocument(savedDocument);
        const followsTheme = savedDocument.canvasSettings.backgroundMode !== "custom"
          && (savedDocument.canvasSettings.backgroundMode === "theme-default" || isDefaultDocumentBackground(savedDocument.canvasSettings.backgroundColor));
        const restoredSettings = {
            ...savedDocument.canvasSettings,
            backgroundMode: followsTheme ? "theme-default" : "custom",
            backgroundColor: followsTheme
              ? createDefaultCanvasSettings(themeRef.current).backgroundColor
              : savedDocument.canvasSettings.backgroundColor,
          } satisfies CanvasSettings;
        remoteSettingsSignatureRef.current = JSON.stringify(restoredSettings);
        setCanvasSettings(restoredSettings);
        setBoardName(typeof result.board.name === "string" ? result.board.name : savedDocument.name || DEFAULT_DOCUMENT_NAME);
        setPersistenceFailed(false);
        setLoadedBoard({ id: boardId, status: "ready" });
      } catch (error) {
        console.error("[SketchFlow] Board load failed:", error);
        if (active && generation === restoreGenerationRef.current) {
          setLoadedBoard({ id: boardId, status: "error" });
          setPersistenceFailed(true);
        }
      } finally {
        if (active && generation === restoreGenerationRef.current) setIsDocumentRestoring(false);
      }
    })();
    return () => { active = false; };
  }, [boardId]);

  // Canvas settings and the board name are persisted document data too.
  useEffect(() => {
    persistenceStateRef.current = { canvasSettings, boardName };
    if (!persistenceInputsMounted.current) {
      persistenceInputsMounted.current = true;
      return;
    }
    debouncedAutosave.current?.();
  }, [canvasSettings, boardName]);

  useEffect(() => {
    const signature = JSON.stringify(storedCanvasSettings);
    if (remoteSettingsSignatureRef.current === signature) {
      remoteSettingsSignatureRef.current = null;
      return;
    }
    const socket = socketRef.current;
    if (boardLoadState === "ready" && socket && boardId) {
      socket.emit("canvas-settings-updated", { boardId, canvasSettings: storedCanvasSettings });
    }
  }, [boardId, boardLoadState, storedCanvasSettings]);

  const handleNewDocument = async () => {
    try {
      const result = await createBoard();
      window.location.assign(result.path);
    } catch (error) {
      console.error("[SketchFlow] New board creation failed:", error);
      setPersistenceFailed(true);
    }
  };

  const handleCreateBoardFromNotFound = async () => {
    if (isCreatingBoard) return;
    setIsCreatingBoard(true);
    setBoardCreationError(false);
    try {
      const result = await createBoard();
      window.location.assign(result.path);
    } catch (error) {
      console.error("[SketchFlow] Board creation from not-found page failed:", error);
      setBoardCreationError(true);
      setIsCreatingBoard(false);
    }
  };

  const handleBoardNameChange = async (name: string) => {
    try {
      const response = await fetch(`${getBackendUrl()}/api/boards/${encodeURIComponent(boardId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error("Board name could not be saved");
      setBoardName(name);
      setPersistenceFailed(false);
    } catch (error) {
      console.error("[SketchFlow] Board rename failed:", error);
      setPersistenceFailed(true);
    }
  };

  const boardElements = documentState.records
    .filter((record): record is Extract<CreationRecord, { kind: "element" }> => record.kind === "element")
    .map((record) => record.value);

  if (boardLoadState === "not-found" || boardLoadState === "error") {
    const notFound = boardLoadState === "not-found";
    return (
      <main className="relative flex min-h-dvh items-center justify-center bg-slate-50 px-4 sm:px-6 text-slate-900 dark:bg-slate-900 dark:text-slate-50">
        {/* Subtle decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute top-20 left-10 w-32 h-32 text-teal-100 dark:text-teal-900/20 opacity-50" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M 10 10 Q 50 10 90 50" />
            <path d="M 10 30 Q 50 30 90 70" />
            <path d="M 10 50 Q 50 50 90 90" />
          </svg>
          <svg className="absolute bottom-20 right-10 w-40 h-40 text-teal-100 dark:text-teal-900/20 opacity-50" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="50" cy="50" r="30" />
            <circle cx="50" cy="50" r="20" />
            <circle cx="50" cy="50" r="10" />
          </svg>
        </div>

        {/* Main card */}
        <div className="relative z-10 w-full max-w-md">
          {/* Logo mark */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="6" width="24" height="20" rx="2" />
                <path d="M 8 12 L 14 18 L 24 8" />
              </svg>
              <span className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">SketchFlow</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 sm:p-10">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-teal-600 dark:text-teal-400" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 8 8 L 24 8 L 24 24 L 8 24 Z" />
                  <path d="M 12 16 L 16 20 L 22 12" />
                </svg>
              </div>
            </div>

            {/* Heading */}
            <h1 className="text-2xl font-semibold text-center text-slate-900 dark:text-slate-50 mb-3">
              {notFound ? "This board doesn't exist" : "Could not load this board"}
            </h1>

            {/* Supporting text */}
            <p className="text-sm text-center text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
              {notFound 
                ? "The board link may be invalid or the board may have been removed. Create a new board and start drawing."
                : "Check that the backend and database are running, then try again."}
            </p>

            {/* Primary button */}
            <button
              type="button"
              onClick={handleCreateBoardFromNotFound}
              disabled={isCreatingBoard}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 font-medium text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-wait disabled:opacity-70"
            >
              {isCreatingBoard ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 12 2 A 10 10 0 0 1 22 12" />
                    <path d="M 12 2 A 10 10 0 0 0 2 12" opacity="0.5" />
                    <path d="M 12 2 A 10 10 0 0 0 2 12" opacity="0.5" transform="rotate(120 12 12)" />
                    <path d="M 12 2 A 10 10 0 0 0 2 12" opacity="0.5" transform="rotate(240 12 12)" />
                  </svg>
                  Creating board…
                </>
              ) : (
                "Create a new board"
              )}
            </button>

            {/* Error message */}
            {boardCreationError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
                <p role="alert" className="text-sm text-rose-700 dark:text-rose-300 text-center">
                  Could not create a board. Check that the backend and database are running.
                </p>
              </div>
            )}

            {/* Secondary action */}
            <div className="mt-6 text-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M 19 12 L 5 12 M 12 19 L 5 12 L 12 5" />
                </svg>
                Back to home
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-50 text-slate-950 dark:bg-slate-900 dark:text-slate-50">
      <BoardHeader
        boardName={boardName}
        onBoardNameChange={handleBoardNameChange}
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={() => boardRef.current?.undo()}
        onRedo={() => boardRef.current?.redo()}
        onExportPng={() => boardRef.current?.exportCanvas("png", canvasSettings.backgroundColor, boardName)}
        onExportSvg={() => boardRef.current?.exportCanvas("svg", canvasSettings.backgroundColor, boardName)}
        onExportSketchFlow={() => boardRef.current?.exportCanvas("sketchflow", canvasSettings.backgroundColor, boardName)}
        onNewDocument={handleNewDocument}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ToolRail
          activeTool={activeTool}
          onToolSelect={setActiveTool}
          onImageSelect={(file) => boardRef.current?.addImage?.(file)}
          selections={documentState.selections}
          elements={boardElements}
          canvasSettings={canvasSettings}
          onUpdateTextColor={(color) => boardRef.current?.updateTextColor(color)}
          onUpdateCanvasSettings={setCanvasSettings}
          onOpenCanvasSettings={() => setActivePanel("canvas-settings")}
        />
        <BoardCanvas
          ref={boardRef}
          boardId={boardId}
          remoteSelectionElements={boardElements}
          onElementCreated={broadcastElementCreated}
          onElementUpdated={broadcastElementUpdated}
          onElementDeleted={broadcastElementDeleted}
          onFreehandCreated={broadcastFreehandCreated}
          onFreehandDeleted={broadcastFreehandDeleted}
          onTextContentUpdated={broadcastTextContentUpdated}
          onCursorMove={broadcastCursor}
          onViewportChange={broadcastViewport}
          activeTool={activeTool}
          canvasSettings={canvasSettings}
          onToolSelect={setActiveTool}
          onAutosave={() => debouncedAutosave.current?.()}
          onHistoryChange={(canUndo, canRedo) => setHistoryStatus({ canUndo, canRedo })}
          onDocumentChange={(records, groups, selections) => {
            setDocumentState({ records, groups, selections });
            const selectedElementIds = getSelectedElementIds(selections, records);
            const currentSelectionSignature = JSON.stringify(selectedElementIds);
            if (JSON.stringify(localSelectionIdsRef.current) !== currentSelectionSignature) {
              localSelectionIdsRef.current = selectedElementIds;
              broadcastSelection(selectedElementIds);
            }
            if (selections.length > 0) {
              setActivePanel("properties");
            } else {
              setActivePanel((current) => current === "properties" ? null : current);
            }
          }}
        />
        {activePanel && (
          <div className="absolute right-0 top-0 bottom-0 z-50 flex w-[min(16rem,calc(100vw-4rem))] flex-col border-l border-slate-200/80 bg-white/95 shadow-xl backdrop-blur transition-transform dark:border-slate-700/80 dark:bg-slate-800/95">
            {activePanel === "layers" && (
              <LayersPanel
                isOpen={true}
                onClose={() => setActivePanel(null)}
                records={documentState.records}
                groups={documentState.groups}
                selections={documentState.selections}
                onSelect={(selections) => boardRef.current?.setSelection(selections)}
                onDelete={() => boardRef.current?.deleteSelection()}
                onLayerOperation={(op) => boardRef.current?.applyLayerOperation(op)}
                onToggleLock={(target) => boardRef.current?.toggleLock(target)}
              />
            )}
            {activePanel === "properties" && (
              <PropertiesPanel
                selections={documentState.selections}
                elements={boardElements}
                groups={documentState.groups}
                onUpdateProperties={(updates, commitHistory) => boardRef.current?.updateProperties(updates, commitHistory)}
                onSetLocked={(locked) => {
                  if (locked) boardRef.current?.lock();
                  else boardRef.current?.unlock();
                }}
                onStartCrop={() => boardRef.current?.startCrop()}
              />
            )}
            {activePanel === "canvas-settings" && (
              <CanvasSettingsPanel
                canvasSettings={canvasSettings}
                onUpdateCanvasSettings={setCanvasSettings}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
        {(isDocumentRestoring || boardLoadState === "loading") && (
          <div role="status" className="absolute inset-0 z-[60] flex items-center justify-center bg-white/70 text-sm text-slate-600 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-300">
            Loading board…
          </div>
        )}
      </div>
      {persistenceFailed && (
        <div role="alert" className="fixed bottom-4 right-4 z-[70] rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          Autosave could not store the latest document. Changes may not survive a reload.
        </div>
      )}
    </main>
  );
}
