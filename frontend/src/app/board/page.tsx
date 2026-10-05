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
import { useTheme } from "@/components/ThemeProvider";
import type { Point, Viewport } from "@/types/geometry";
import type { Collaborator } from "@/collaboration/presenceStore";
import type { Tool, SelectionSet } from "@/types/editor";
import type { CreationRecord, Group, CanvasSettings } from "@/types/canvas";
import { getBoardIdFromLocation, subscribeToBoardIdChanges, createCollaborator, getSelectedElementIds } from "./boardHelpers";
import { setupCollaboration, broadcastElementCreated, broadcastElementUpdated, broadcastElementDeleted, broadcastFreehandCreated, broadcastFreehandDeleted, broadcastTextContentUpdated, broadcastCursor, broadcastSelection, broadcastViewport, type CollaborationRefs } from "./boardCollaboration";
import { loadBoard, createNewBoard, renameBoard } from "./boardPersistence";
import type { Socket } from "socket.io-client";

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
  const boardIdRef = useRef("");
  const restoreGenerationRef = useRef(0);
  const persistenceStateRef = useRef({ canvasSettings, boardName });
  const persistenceInputsMounted = useRef(false);
  const localSelectionIdsRef = useRef<string[]>([]);
  const remoteSettingsSignatureRef = useRef<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const pendingCursorRef = useRef<Point | null>(null);
  const cursorTimerRef = useRef<number | null>(null);
  const collaboratorRef = useRef<Collaborator | null>(null);
  const pendingViewportRef = useRef<Viewport | null>(null);
  const viewportTimerRef = useRef<number | null>(null);
  const lastBroadcastViewportRef = useRef<string | null>(null);
  const lastBroadcastSelectionSignatureRef = useRef<string | null>(null);

  const collaborationRefs: CollaborationRefs = {
    boardRef,
    socketRef,
    collaboratorRef,
    pendingCursorRef,
    cursorTimerRef,
    pendingViewportRef,
    viewportTimerRef,
    lastBroadcastViewportRef,
    lastBroadcastSelectionSignatureRef,
    remoteSettingsSignatureRef,
    boardIdRef,
  };

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
    const cleanup = setupCollaboration(
      boardId,
      identity,
      collaborationRefs,
      localSelectionIdsRef,
      {
        onRemoteSettingsUpdate: setCanvasSettings,
        onPersistenceError: () => setPersistenceFailed(true),
      },
    );

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, boardLoadState, isDocumentRestoring]);

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
      const result = await loadBoard(boardId);
      if (!active || generation !== restoreGenerationRef.current) return;

      if (result.status === "not-found") {
        setLoadedBoard({ id: boardId, status: "not-found" });
        setIsDocumentRestoring(false);
        return;
      }

      if (result.status === "error") {
        setLoadedBoard({ id: boardId, status: "error" });
        setPersistenceFailed(true);
        setIsDocumentRestoring(false);
        return;
      }

      if (result.status === "ready" && result.document) {
        boardRef.current?.restoreDocument(result.document);
        const followsTheme = result.canvasSettings!.backgroundMode !== "custom"
          && (result.canvasSettings!.backgroundMode === "theme-default" || isDefaultDocumentBackground(result.canvasSettings!.backgroundColor));
        const restoredSettings = {
            ...result.canvasSettings!,
            backgroundMode: followsTheme ? "theme-default" : "custom",
            backgroundColor: followsTheme
              ? createDefaultCanvasSettings(themeRef.current).backgroundColor
              : result.canvasSettings!.backgroundColor,
          } satisfies CanvasSettings;
        remoteSettingsSignatureRef.current = JSON.stringify(restoredSettings);
        setCanvasSettings(restoredSettings);
        setBoardName(result.boardName!);
        setPersistenceFailed(false);
        setLoadedBoard({ id: boardId, status: "ready" });
        setIsDocumentRestoring(false);
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
      const result = await createNewBoard();
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
      const result = await createNewBoard();
      window.location.assign(result.path);
    } catch (error) {
      console.error("[SketchFlow] Board creation from not-found page failed:", error);
      setBoardCreationError(true);
      setIsCreatingBoard(false);
    }
  };

  const handleBoardNameChange = async (name: string) => {
    try {
      await renameBoard(boardId, name);
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
          onElementCreated={(element) => broadcastElementCreated(collaborationRefs, element)}
          onElementUpdated={(element) => broadcastElementUpdated(collaborationRefs, element)}
          onElementDeleted={(elementId) => broadcastElementDeleted(collaborationRefs, elementId)}
          onFreehandCreated={(stroke, strokeIndex, creationOrderIndex) => broadcastFreehandCreated(collaborationRefs, stroke, strokeIndex, creationOrderIndex)}
          onFreehandDeleted={(stroke, strokeIndex, creationOrderIndex) => broadcastFreehandDeleted(collaborationRefs, stroke, strokeIndex, creationOrderIndex)}
          onTextContentUpdated={(elementId, text) => broadcastTextContentUpdated(collaborationRefs, elementId, text)}
          onCursorMove={(point) => broadcastCursor(collaborationRefs, point)}
          onViewportChange={(viewport) => broadcastViewport(collaborationRefs, viewport)}
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
              broadcastSelection(collaborationRefs, selectedElementIds);
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
