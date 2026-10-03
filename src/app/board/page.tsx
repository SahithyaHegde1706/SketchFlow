"use client";

import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { BoardCanvas } from "@/components/board/canvas/BoardCanvas";
import type { BoardCanvasHandle } from "@/components/board/canvas/BoardCanvas";
import { BoardHeader } from "@/components/board/header/BoardHeader";
import { ToolRail } from "@/components/board/toolbar/ToolRail";
import { LayersPanel } from "@/components/board/layers/LayersPanel";
import { PropertiesPanel } from "@/components/board/properties/PropertiesPanel";
import { saveToLocalStorage, loadFromLocalStorage, createDebouncedAutosave } from "@/document/autosave";
import { createDefaultCanvasSettings, DEFAULT_DOCUMENT_NAME, isDefaultDocumentBackground } from "@/document/defaults";
import { useTheme } from "@/components/ThemeProvider";

import type { Tool, CreationRecord, Group, SelectionSet, CanvasSettings } from "@/types/canvas";

export default function BoardPage() {
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activePanel, setActivePanel] = useState<"layers" | "properties" | null>("properties");
  const [documentState, setDocumentState] = useState({
    records: [] as CreationRecord[],
    groups: [] as Group[],
    selections: [] as SelectionSet
  });
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const [persistenceFailed, setPersistenceFailed] = useState(false);
  const [isDocumentRestoring, setIsDocumentRestoring] = useState(true);
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
  const restoreGenerationRef = useRef(0);
  const persistenceStateRef = useRef({ canvasSettings, boardName });
  const persistenceInputsMounted = useRef(false);

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

  // Restore autosaved document on mount
  useEffect(() => {
    let active = true;
    const generation = restoreGenerationRef.current;
    void (async () => {
      try {
        const autosavedDoc = await loadFromLocalStorage();
        if (!active || generation !== restoreGenerationRef.current) return;
        if (autosavedDoc && boardRef.current) {
          boardRef.current.restoreDocument(autosavedDoc);
          const followsTheme = autosavedDoc.canvasSettings.backgroundMode !== "custom"
            && (autosavedDoc.canvasSettings.backgroundMode === "theme-default" || isDefaultDocumentBackground(autosavedDoc.canvasSettings.backgroundColor));
          setCanvasSettings({
            ...autosavedDoc.canvasSettings,
            backgroundMode: followsTheme ? "theme-default" : "custom",
            backgroundColor: followsTheme
              ? createDefaultCanvasSettings(themeRef.current).backgroundColor
              : autosavedDoc.canvasSettings.backgroundColor,
          });
          if (autosavedDoc.name) setBoardName(autosavedDoc.name);
        }
      } catch (err) {
        console.error("[SketchFlow] Document restore failed:", err);
        setPersistenceFailed(true);
      } finally {
        if (active) setIsDocumentRestoring(false);
      }
    })();
    return () => { active = false; };
  }, []);

  // Canvas settings and the board name are persisted document data too.
  useEffect(() => {
    persistenceStateRef.current = { canvasSettings, boardName };
    if (!persistenceInputsMounted.current) {
      persistenceInputsMounted.current = true;
      return;
    }
    debouncedAutosave.current?.();
  }, [canvasSettings, boardName]);

  // Handle new document
  const handleNewDocument = () => {
    restoreGenerationRef.current += 1;
    const defaults = createDefaultCanvasSettings(themeRef.current);
    boardRef.current?.clearDocument();
    setCanvasSettings(defaults);
    setBoardName(DEFAULT_DOCUMENT_NAME);
    // Replace autosave immediately so a reload cannot restore the previous document.
    void persistDocument([], [], [], [], defaults, DEFAULT_DOCUMENT_NAME);
  };

  const boardElements = documentState.records
    .filter((record): record is Extract<CreationRecord, { kind: "element" }> => record.kind === "element")
    .map((record) => record.value);

  return (
    <main className="flex h-dvh min-h-150 flex-col overflow-hidden bg-slate-50 text-slate-950 relative dark:bg-slate-900 dark:text-slate-50">
      <BoardHeader
        boardName={boardName}
        onBoardNameChange={setBoardName}
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
        />
        <BoardCanvas
          ref={boardRef}
          activeTool={activeTool}
          canvasSettings={canvasSettings}
          onToolSelect={setActiveTool}
          onAutosave={() => debouncedAutosave.current?.()}
          onHistoryChange={(canUndo, canRedo) => setHistoryStatus({ canUndo, canRedo })}
          onDocumentChange={(records, groups, selections) => {
            setDocumentState({ records, groups, selections });
            if (selections.length > 0) setActivePanel("properties");
          }}
        />
        {activePanel && (
          <div className="absolute right-0 top-16 bottom-0 w-64 bg-white/95 backdrop-blur border-l border-slate-200/80 shadow-xl flex flex-col z-50 transform transition-transform dark:bg-slate-800/95 dark:border-slate-700/80">
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
                canvasSettings={canvasSettings}
                onUpdateProperties={(updates, commitHistory) => boardRef.current?.updateProperties(updates, commitHistory)}
                onUpdateCanvasSettings={setCanvasSettings}
                onStartCrop={() => boardRef.current?.startCrop()}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
        {isDocumentRestoring && (
          <div role="status" className="absolute inset-0 z-[60] flex items-center justify-center bg-white/70 text-sm text-slate-600 backdrop-blur-sm dark:bg-slate-900/70 dark:text-slate-300">
            Restoring board…
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
