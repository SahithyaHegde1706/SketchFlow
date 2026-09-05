"use client";

import { useRef, useState } from "react";
import { BoardCanvas } from "@/components/BoardCanvas";
import { BoardHeader } from "@/components/BoardHeader";
import { ToolRail } from "@/components/ToolRail";

import type { Tool } from "@/types/canvas";

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const boardRef = useRef<{ 
    undo: () => void; 
    redo: () => void;
    copy: () => void;
    paste: () => void;
    duplicate: () => void;
  }>(null);

  return (
    <main className="flex h-dvh min-h-150 flex-col overflow-hidden bg-slate-50 text-slate-950">
      <BoardHeader
        canUndo={historyStatus.canUndo}
        canRedo={historyStatus.canRedo}
        onUndo={() => boardRef.current?.undo()}
        onRedo={() => boardRef.current?.redo()}
      />
      <div className="relative flex min-h-0 flex-1">
        <ToolRail activeTool={activeTool} onToolSelect={setActiveTool} />
        <BoardCanvas
          ref={boardRef}
          activeTool={activeTool}
          onToolSelect={setActiveTool}
          onHistoryChange={(canUndo, canRedo) => setHistoryStatus({ canUndo, canRedo })}
        />
      </div>
    </main>
  );
}
