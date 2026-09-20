"use client";

import type { LayerAvailability, LayerOperation } from "@/editor/layering";
import { LayerControls } from "@/components/LayerControls";
import { GroupControls } from "@/components/GroupControls";
import { AlignControls } from "@/components/AlignControls";
import { LockControls } from "@/components/LockControls";
import { useEffect, useRef, useState } from "react";
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
  /** Called when the user clicks Export PNG. */
  onExportPng?: () => void;
  /** Called when the user clicks Export SVG. */
  onExportSvg?: () => void;
};

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
  onExportPng,
  onExportSvg,
}: BoardHeaderProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Close export popover when clicking outside
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [exportOpen]);

  // Close export popover on Escape
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [exportOpen]);

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-7">
      {/* Left: logo + board name */}
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

      {/* Right: controls */}
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

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M3 13c0-4.97 4.03-9 9-9a9 9 0 0 1 0 18H3" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M21 13c0-4.97-4.03-9-9-9a9 9 0 0 0 0 18h9" />
          </svg>
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Panel toggles */}
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

        <div className="mx-1 h-5 w-px bg-slate-200" />

        {/* Export popover */}
        <div ref={exportRef} className="relative">
          <button
            type="button"
            id="export-menu-button"
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            onClick={() => setExportOpen((v) => !v)}
            title="Export"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-teal-600 bg-teal-600 px-3 text-sm font-semibold text-white shadow-sm shadow-teal-600/20 transition hover:bg-teal-700 hover:border-teal-700 active:scale-[0.97]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${exportOpen ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {exportOpen && (
            <div
              role="menu"
              aria-label="Export options"
              className="absolute right-0 top-full z-50 mt-1.5 w-44 origin-top-right rounded-xl border border-slate-200/80 bg-white shadow-xl ring-1 ring-black/5 focus:outline-none"
            >
              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  type="button"
                  id="export-png-button"
                  role="menuitem"
                  onClick={() => { setExportOpen(false); onExportPng?.(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-teal-50 text-teal-600 text-[10px] font-bold">PNG</span>
                  Export PNG
                </button>
                <button
                  type="button"
                  id="export-svg-button"
                  role="menuitem"
                  onClick={() => { setExportOpen(false); onExportSvg?.(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-violet-50 text-violet-600 text-[10px] font-bold">SVG</span>
                  Export SVG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
