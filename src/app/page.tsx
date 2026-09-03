import { BoardCanvas } from "@/components/BoardCanvas";
import { BoardHeader } from "@/components/BoardHeader";
import { ToolRail } from "@/components/ToolRail";
import { ZoomControls } from "@/components/ZoomControls";

export default function Home() {
  return (
    <main className="flex h-dvh min-h-150 flex-col overflow-hidden bg-slate-50 text-slate-950">
      <BoardHeader />
      <div className="relative flex min-h-0 flex-1">
        <ToolRail />
        <BoardCanvas />
        <ZoomControls />
      </div>
    </main>
  );
}
