"use client";

import { useRef, useState } from "react";
import { BoardCanvas } from "@/components/BoardCanvas";
import type { BoardCanvasHandle } from "@/components/BoardCanvas";
import { BoardHeader } from "@/components/BoardHeader";
import { ToolRail } from "@/components/ToolRail";
import { LayersPanel } from "@/components/LayersPanel";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import type { LayerAvailability, LayerOperation } from "@/editor/layering";
import { validateDocument } from "@/document/serialization";

import type { Tool, CreationRecord, Group, SelectionSet, WhiteboardElement, CanvasSettings } from "@/types/canvas";

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activePanel, setActivePanel] = useState<"layers" | "properties" | null>(null);
  const [documentState, setDocumentState] = useState({
    records: [] as CreationRecord[],
    groups: [] as Group[],
    selections: [] as SelectionSet
  });
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const [layerAvailability, setLayerAvailability] = useState<LayerAvailability>({
    canBringForward: false,
    canSendBackward: false,
    canBringToFront: false,
    canSendToBack: false,
  });
  const [groupAvailability, setGroupAvailability] = useState({ canGroup: false, canUngroup: false });
  const [alignAvailability, setAlignAvailability] = useState({ canAlign: false, canDistribute: false });
  const [lockAvailability, setLockAvailability] = useState({ canLock: false, canUnlock: false });
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    backgroundColor: "#f8fafc",
    showGrid: false,
    gridSize: 16,
    snapSettings: {
      enabled: true,
      gridEnabled: false,
      gridSize: 16,
      threshold: 6,
    },
  });
  const [importError, setImportError] = useState<string | null>(null);
  const boardRef = useRef<BoardCanvasHandle>(null);

  // Clear import error automatically after 5 seconds
  if (importError) {
    setTimeout(() => setImportError(null), 5000);
  }

  return (
    <main className="flex h-dvh min-h-150 flex-col overflow-hidden bg-slate-50 text-slate-950 relative">
      {importError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 shadow-md border border-red-200 animate-in fade-in slide-in-from-top-4">
          {importError}
        </div>
      )}
      <BoardHeader
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={() => boardRef.current?.undo()}
        onRedo={() => boardRef.current?.redo()}
        layerAvailability={layerAvailability}
        onLayerOperation={(operation: LayerOperation) => boardRef.current?.applyLayerOperation(operation)}
        canGroup={groupAvailability.canGroup}
        canUngroup={groupAvailability.canUngroup}
        onGroup={() => boardRef.current?.group()}
        onUngroup={() => boardRef.current?.ungroup()}
        canAlign={alignAvailability.canAlign}
        canDistribute={alignAvailability.canDistribute}
        onAlign={(operation) => boardRef.current?.align(operation)}
        canLock={lockAvailability.canLock}
        canUnlock={lockAvailability.canUnlock}
        onLock={() => boardRef.current?.lock()}
        onUnlock={() => boardRef.current?.unlock()}
        activePanel={activePanel}
        onTogglePanel={(panel) => setActivePanel(activePanel === panel ? null : panel)}
        onExportPng={() => boardRef.current?.exportCanvas("png", canvasSettings.backgroundColor)}
        onExportSvg={() => boardRef.current?.exportCanvas("svg", canvasSettings.backgroundColor)}
        onExportSketchFlow={() => boardRef.current?.exportCanvas("sketchflow", canvasSettings.backgroundColor)}
        onImportDocument={async (file) => {
          try {
            setImportError(null);
            const text = await file.text();
            const doc = validateDocument(text);
            if (!doc) {
              setImportError("Invalid or unsupported SketchFlow document.");
              console.error("[SketchFlow] Invalid document format.");
              return;
            }
            boardRef.current?.importDocument(doc);
            setCanvasSettings(doc.canvasSettings);
          } catch (err) {
            setImportError("Unable to read the selected file.");
            console.error("[SketchFlow] Failed to read file:", err);
          }
        }}
      />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ToolRail activeTool={activeTool} onToolSelect={setActiveTool} />
        <BoardCanvas
          ref={boardRef}
          activeTool={activeTool}
          canvasSettings={canvasSettings}
          onToolSelect={setActiveTool}
          onHistoryChange={(canUndo, canRedo) => setHistoryStatus({ canUndo, canRedo })}
          onLayerChange={setLayerAvailability}
          onGroupAvailabilityChange={(canGroup, canUngroup) => setGroupAvailability({ canGroup, canUngroup })}
          onAlignAvailabilityChange={(canAlign, canDistribute) => setAlignAvailability({ canAlign, canDistribute })}
          onLockAvailabilityChange={(canLock, canUnlock) => setLockAvailability({ canLock, canUnlock })}
          onDocumentChange={(records, groups, selections) => setDocumentState({ records, groups, selections })}
        />
        {activePanel && (
          <div className="absolute right-0 top-16 bottom-0 w-64 bg-white/95 backdrop-blur border-l border-slate-200/80 shadow-xl flex flex-col z-50 transform transition-transform">
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
                onUpdateProperties={(updates) => boardRef.current?.updateProperties(updates)}
                onUpdateCanvasSettings={setCanvasSettings}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
