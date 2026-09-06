"use client";

import { useRef, useState } from "react";
import { BoardCanvas } from "@/components/BoardCanvas";
import type { BoardCanvasHandle } from "@/components/BoardCanvas";
import { BoardHeader } from "@/components/BoardHeader";
import { ToolRail } from "@/components/ToolRail";
import { LayersPanel } from "@/components/LayersPanel";
import { PropertiesPanel } from "@/components/PropertiesPanel";
import type { LayerAvailability, LayerOperation } from "@/editor/layering";

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
  const [canvasSettings, setCanvasSettings] = useState<CanvasSettings>({
    backgroundColor: "#f8fafc",
    showGrid: false,
    gridSize: 16,
  });
  const boardRef = useRef<BoardCanvasHandle>(null);

  return (
    <main className="flex h-dvh min-h-150 flex-col overflow-hidden bg-slate-50 text-slate-950">
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
        activePanel={activePanel}
        onTogglePanel={(panel) => setActivePanel(activePanel === panel ? null : panel)}
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
