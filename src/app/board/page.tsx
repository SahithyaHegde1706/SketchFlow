"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { BoardCanvas } from "@/components/board/canvas/BoardCanvas";
import type { BoardCanvasHandle } from "@/components/board/canvas/BoardCanvas";
import { BoardHeader } from "@/components/board/header/BoardHeader";
import { ToolRail } from "@/components/board/toolbar/ToolRail";
import { LayersPanel } from "@/components/board/layers/LayersPanel";
import { PropertiesPanel } from "@/components/board/properties/PropertiesPanel";
import { saveToLocalStorage, loadFromLocalStorage, clearAutosave, createDebouncedAutosave } from "@/document/autosave";
import { useTheme } from "@/components/ThemeProvider";

import type { Tool, CreationRecord, Group, SelectionSet, WhiteboardElement, CanvasSettings } from "@/types/canvas";

export default function BoardPage() {
  const { theme } = useTheme();
  const themeRef = useRef(theme);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activePanel, setActivePanel] = useState<"layers" | "properties" | null>(null);
  const [documentState, setDocumentState] = useState({
    records: [] as CreationRecord[],
    groups: [] as Group[],
    selections: [] as SelectionSet
  });
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const [storedCanvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    backgroundColor: theme === "dark" ? "#0f172a" : "#f8fafc",
    showGrid: false,
    gridSize: 16,
    snapSettings: {
      enabled: true,
      gridEnabled: false,
      gridSize: 16,
      threshold: 6,
    },
  });
  const canvasSettings = useMemo(() => {
    const lightDefault = "#f8fafc";
    const darkDefault = "#0f172a";
    const currentBg = storedCanvasSettings.backgroundColor;

    if (currentBg === lightDefault || currentBg === darkDefault) {
      return {
        ...storedCanvasSettings,
        backgroundColor: theme === "dark" ? darkDefault : lightDefault,
      };
    }

    return storedCanvasSettings;
  }, [storedCanvasSettings, theme]);
  const [boardName, setBoardName] = useState("Untitled board");
  const boardRef = useRef<BoardCanvasHandle>(null);
  const persistenceStateRef = useRef({ canvasSettings, boardName });
  const persistenceInputsMounted = useRef(false);

  // Keep one debouncer so rapid document, settings, and name changes share a timer.
  const debouncedAutosave = useRef<(() => void) | null>(null);
  useEffect(() => {
    debouncedAutosave.current = createDebouncedAutosave(() => {
      if (boardRef.current) {
        const docState = boardRef.current.getDocumentState();
        const latest = persistenceStateRef.current;
        saveToLocalStorage(
          docState.strokes,
          docState.elements,
          docState.groups,
          docState.creationOrder,
          latest.canvasSettings,
          latest.boardName
        );
      }
    });
  }, []);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  // Restore autosaved document on mount
  useEffect(() => {
    const autosavedDoc = loadFromLocalStorage();
    if (autosavedDoc && boardRef.current) {
      boardRef.current.restoreDocument(autosavedDoc);
      const lightDefault = "#f8fafc";
      const darkDefault = "#0f172a";
      const savedBg = autosavedDoc.canvasSettings.backgroundColor;
      // If saved background is a default color, update it to match current theme
      const updatedBg = (savedBg === lightDefault || savedBg === darkDefault)
        ? (themeRef.current === "dark" ? darkDefault : lightDefault)
        : savedBg;
      setCanvasSettings({
        ...autosavedDoc.canvasSettings,
        backgroundColor: updatedBg
      });
      if (autosavedDoc.name) {
        setBoardName(autosavedDoc.name);
      }
    }
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
    if (boardRef.current) {
      boardRef.current.clearDocument();
      clearAutosave();
      setBoardName("Untitled board");
    }
  };

  return (
    <main className="flex h-dvh min-h-150 flex-col overflow-hidden bg-slate-50 text-slate-950 relative dark:bg-slate-900 dark:text-slate-50">
      <BoardHeader
        boardName={boardName}
        onBoardNameChange={setBoardName}
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={() => boardRef.current?.undo()}
        onRedo={() => boardRef.current?.redo()}
        activePanel={activePanel}
        onTogglePanel={(panel) => setActivePanel(activePanel === panel ? null : panel)}
        onExportPng={() => boardRef.current?.exportCanvas("png", canvasSettings.backgroundColor, boardName)}
        onExportSvg={() => boardRef.current?.exportCanvas("svg", canvasSettings.backgroundColor, boardName)}
        onExportSketchFlow={() => boardRef.current?.exportCanvas("sketchflow", canvasSettings.backgroundColor, boardName)}
        onNewDocument={handleNewDocument}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ToolRail activeTool={activeTool} onToolSelect={setActiveTool} onImageSelect={(file) => boardRef.current?.addImage?.(file)} />
        <BoardCanvas
          ref={boardRef}
          activeTool={activeTool}
          canvasSettings={canvasSettings}
          onToolSelect={setActiveTool}
          onAutosave={() => debouncedAutosave.current?.()}
          onHistoryChange={(canUndo, canRedo) => setHistoryStatus({ canUndo, canRedo })}
          onDocumentChange={(records, groups, selections) => setDocumentState({ records, groups, selections })}
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
                elements={documentState.records.map(r => r.kind === "element" ? r.value : null).filter(Boolean) as WhiteboardElement[]}
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
      </div>
    </main>
  );
}
