"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

type BoardHeaderProps = {
  boardName: string;
  onBoardNameChange: (name: string) => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  activePanel: "layers" | "properties" | null;
  onTogglePanel: (panel: "layers" | "properties") => void;
  /** Called when the user clicks Export PNG. */
  onExportPng?: () => void;
  /** Called when the user clicks Export SVG. */
  onExportSvg?: () => void;
  /** Called when the user clicks Export SketchFlow. */
  onExportSketchFlow?: () => void;
  onNewDocument?: () => void;
};

export function BoardHeader({
  boardName,
  onBoardNameChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  activePanel,
  onTogglePanel,
  onExportPng,
  onExportSvg,
  onExportSketchFlow,
  onNewDocument,
}: BoardHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [exportOpen, setExportOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(boardName);
  const exportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync editing name when boardName changes externally
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditingName(boardName);
  }, [boardName]);

  const handleStartEditing = () => {
    setEditingName(boardName);
    setIsEditing(true);
  };

  const handleSaveName = () => {
    const trimmedName = editingName.trim();
    if (trimmedName && trimmedName !== boardName) {
      onBoardNameChange(trimmedName);
    } else if (!trimmedName) {
      setEditingName(boardName);
    }
    setIsEditing(false);
  };

  const handleCancelEditing = () => {
    setEditingName(boardName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      handleCancelEditing();
    }
  };

  return (
    <header className="relative z-10 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-7 dark:bg-slate-900/90 dark:border-slate-700/80">
      {/* Left: logo + board name */}
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-sm shadow-teal-600/20">
            S
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-950 dark:text-slate-50">
            SketchFlow
          </span>
        </div>
        <span className="hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveName}
            className="truncate text-sm text-slate-500 bg-transparent border-b border-slate-300 focus:outline-none focus:border-teal-500 px-1 py-0.5 w-32 sm:w-48 dark:text-slate-400 dark:border-slate-600 dark:focus:border-teal-500"
            placeholder="Board name"
          />
        ) : (
          <p
            className="truncate text-sm text-slate-500 cursor-pointer hover:text-slate-700 transition-colors dark:text-slate-400 dark:hover:text-slate-200"
            onClick={handleStartEditing}
            title="Click to rename board"
          >
            {boardName}
          </p>
        )}
      </div>

      {/* Right: controls */}
      <div className="flex items-center gap-2">
        <span className="mr-1 hidden text-xs text-slate-400 lg:block dark:text-slate-500">
          Draw. Think. Collaborate.
        </span>

        <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
          {theme === "light" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2" />
              <path d="M12 20v2" />
              <path d="m4.93 4.93 1.41 1.41" />
              <path d="m17.66 17.66 1.41 1.41" />
              <path d="M2 12h2" />
              <path d="M20 12h2" />
              <path d="m6.34 17.66-1.41 1.41" />
              <path d="m19.07 4.93-1.41 1.41" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>

        <div className="mx-2 hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" />

        {/* Undo / Redo */}
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:disabled:hover:text-slate-400"
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
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:disabled:hover:text-slate-400"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" />
            <path d="M21 13c0-4.97-4.03-9-9-9a9 9 0 0 0 0 18h9" />
          </svg>
        </button>

        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          type="button"
          onClick={() => onTogglePanel("properties")}
          aria-label={activePanel === "properties" ? "Close edit panel" : "Open edit panel"}
          title="Edit selection and canvas settings"
          className={`inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition ${
            activePanel === "properties"
              ? "bg-teal-50 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <span className="hidden sm:inline">Edit</span>
        </button>
        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <button
          type="button"
          onClick={onNewDocument}
          aria-label="New document"
          title="New document"
          className="inline-flex h-8 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
        >
 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          <span className="hidden sm:inline">New</span>
        </button>
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
              className="absolute right-0 top-full z-50 mt-1.5 w-44 origin-top-right rounded-xl border border-slate-200/80 bg-white shadow-xl ring-1 ring-black/5 focus:outline-none dark:border-slate-700/80 dark:bg-slate-800 dark:ring-white/10"
            >
              <div className="p-1.5 flex flex-col gap-0.5">
                <button
                  type="button"
                  id="export-png-button"
                  role="menuitem"
                  onClick={() => { setExportOpen(false); onExportPng?.(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-teal-50 text-teal-600 text-[10px] font-bold dark:bg-teal-900/30 dark:text-teal-300">PNG</span>
                  Export PNG
                </button>
                <button
                  type="button"
                  id="export-svg-button"
                  role="menuitem"
                  onClick={() => { setExportOpen(false); onExportSvg?.(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-violet-50 text-violet-600 text-[10px] font-bold dark:bg-violet-900/30 dark:text-violet-300">SVG</span>
                  Export SVG
                </button>
                <div className="mx-2 my-0.5 h-px bg-slate-100 dark:bg-slate-700" />
                <button
                  type="button"
                  id="export-sketchflow-button"
                  role="menuitem"
                  onClick={() => { setExportOpen(false); onExportSketchFlow?.(); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                >
                  <span className="flex size-6 items-center justify-center rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold dark:bg-slate-700 dark:text-slate-300">SF</span>
                  Export SketchFlow
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
