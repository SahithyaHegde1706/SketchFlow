import type { LayerAvailability, LayerOperation } from "@/editor/layering";
import { LayerControls } from "@/components/LayerControls";
import { GroupControls } from "@/components/GroupControls";
import { AlignControls } from "@/components/AlignControls";
import { LockControls } from "@/components/LockControls";
import type { AlignOperation } from "@/types/canvas";

type BoardHeaderProps = {
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  layerAvailability: LayerAvailability;
  onLayerOperation: (operation: LayerOperation) => void;
  canGroup?: boolean;
  canUngroup?: boolean;
  onGroup?: () => void;
  onUngroup?: () => void;
  canAlign?: boolean;
  canDistribute?: boolean;
  onAlign?: (operation: AlignOperation) => void;
  canLock?: boolean;
  canUnlock?: boolean;
  onLock?: () => void;
  onUnlock?: () => void;
  activePanel: "layers" | "properties" | null;
  onTogglePanel: (panel: "layers" | "properties") => void;
};

const MoreIcon = () => <span aria-hidden="true">...</span>;

export function BoardHeader({
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  layerAvailability,
  onLayerOperation,
  canGroup = false,
  canUngroup = false,
  onGroup,
  onUngroup,
  canAlign = false,
  canDistribute = false,
  onAlign,
  canLock = false,
  canUnlock = false,
  onLock,
  onUnlock,
  activePanel,
  onTogglePanel,
}: BoardHeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-7">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-sm shadow-teal-600/20">
            S
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-950">
            SketchFlow
          </span>
        </div>
        <span className="hidden h-5 w-px bg-slate-200 sm:block" />
        <p className="truncate text-sm text-slate-500">Untitled board</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-1 hidden text-xs text-slate-400 lg:block">
          Draw. Think. Collaborate.
        </span>

        <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />

        <LockControls
          canLock={canLock}
          canUnlock={canUnlock}
          onLock={onLock || (() => {})}
          onUnlock={onUnlock || (() => {})}
        />

        <GroupControls
          canGroup={canGroup}
          canUngroup={canUngroup}
          onGroup={onGroup || (() => {})}
          onUngroup={onUngroup || (() => {})}
        />

        <AlignControls
          canAlign={canAlign}
          canDistribute={canDistribute}
          onAlign={onAlign || (() => {})}
        />

        <LayerControls {...layerAvailability} onLayerOperation={onLayerOperation} />

        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo (Ctrl+Z)"
          className="inline-flex size-9 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
        >
          <span aria-hidden="true">↶</span>
        </button>

        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo (Ctrl+Shift+Z)"
          className="inline-flex size-9 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
        >
          <span aria-hidden="true">↷</span>
        </button>

        <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block" />

        <button
          type="button"
          aria-label="Share board"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <span aria-hidden="true" className="text-base leading-none">↗</span>
          <span className="hidden sm:inline">Share</span>
        </button>
        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => onTogglePanel("layers")}
            aria-label={activePanel === "layers" ? "Close layers panel" : "Open layers panel"}
            title="Layers"
            className={`inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition ${
              activePanel === "layers"
                ? "bg-teal-50 text-teal-800"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 12 12 17 22 12" />
              <polyline points="2 17 12 22 22 17" />
            </svg>
            <span className="hidden sm:inline">Layers</span>
          </button>
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          <button
            type="button"
            onClick={() => onTogglePanel("properties")}
            aria-label={activePanel === "properties" ? "Close properties panel" : "Open properties panel"}
            title="Properties"
            className={`inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition ${
              activePanel === "properties"
                ? "bg-teal-50 text-teal-800"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 20h9"/>
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
            <span className="hidden sm:inline">Properties</span>
          </button>
        </div>
        <button
          type="button"
          aria-label="More board options"
          title="More options"
          className="inline-flex size-9 items-center justify-center rounded-lg text-lg font-semibold tracking-[0.18em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <MoreIcon />
        </button>
      </div>
    </header>
  );
}
