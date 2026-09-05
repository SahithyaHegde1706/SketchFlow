"use client";

import { useState } from "react";
import { BoardCanvas } from "@/components/BoardCanvas";
import { BoardHeader } from "@/components/BoardHeader";
import { ToolRail } from "@/components/ToolRail";

import type { Tool } from "@/components/whiteboard/types";

export default function Home() {
  const [activeTool, setActiveTool] = useState<Tool>("select");

  return (
    <main className="flex h-dvh min-h-150 flex-col overflow-hidden bg-slate-50 text-slate-950">
      <BoardHeader />
      <div className="relative flex min-h-0 flex-1">
        <ToolRail activeTool={activeTool} onToolSelect={setActiveTool} />
        <BoardCanvas activeTool={activeTool} />
      </div>
    </main>
  );
}
