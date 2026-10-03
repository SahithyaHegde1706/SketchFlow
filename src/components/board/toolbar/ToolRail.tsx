import type { CanvasSettings, SelectionSet, TextElement, Tool, WhiteboardElement } from "@/types/canvas";

const tools = [
  { label: "Hand / Pan", icon: "✦", value: "hand" },
  { label: "Rectangle", icon: "▭", value: "rectangle" },
  { label: "Rounded Rectangle", icon: "▢", value: "roundedRectangle" },
  { label: "Circle", icon: "○", value: "circle" },
  { label: "Line", icon: "╱", value: "line" },
  { label: "Arrow", icon: "↗", value: "arrow" },
  { label: "Image", icon: "🖼", value: "image" },
  { label: "Text", icon: "T", value: "text" },
  { label: "Draw / Pen", icon: "⌁", value: "draw" },
  { label: "Eraser", icon: "⌫", value: "eraser" },
] as const;

type ToolRailProps = {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
  onImageSelect?: (file: File) => void;
  selections: SelectionSet;
  elements: WhiteboardElement[];
  canvasSettings: CanvasSettings;
  onUpdateTextColor: (color: string) => void;
  onUpdateCanvasSettings: (settings: CanvasSettings) => void;
};

import { useRef } from "react";

export function ToolRail({
  activeTool,
  onToolSelect,
  onImageSelect,
  selections,
  elements,
  canvasSettings,
  onUpdateTextColor,
  onUpdateCanvasSettings,
}: ToolRailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedElementIds = new Set<string>();
  const selectedTextElements = new Map<string, TextElement>();
  for (const selection of selections) {
    if (selection.kind === "element") {
      if (selection.value.type === "text") selectedTextElements.set(selection.value.id, selection.value);
    } else if (selection.kind === "group") {
      for (const id of selection.value.elementIds) selectedElementIds.add(id);
    }
  }
  for (const element of elements) {
    if (selectedElementIds.has(element.id) && element.type === "text") selectedTextElements.set(element.id, element);
  }
  const selectedTextColorValues = Array.from(selectedTextElements.values()).map((element) => element.strokeColor);
  const textColors = new Set(selectedTextColorValues);
  const textColor = textColors.size === 1 ? selectedTextColorValues[0] : undefined;
  const hasMixedTextColors = textColors.size > 1;

  const handleToolClick = (toolValue: Tool) => {
    if (toolValue === "image") {
      fileInputRef.current?.click();
      return;
    }
    onToolSelect(toolValue);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    onToolSelect("select");
    if (onImageSelect) {
      onImageSelect(file);
    }
    
    // reset the input
    e.target.value = "";
  };

  return (
    <aside className="absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:left-6 md:top-6 dark:border-slate-700/90 dark:bg-slate-800/95 dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <nav aria-label="Whiteboard tools" className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            title={tool.label}
            aria-pressed={activeTool === tool.value}
            onClick={() => handleToolClick(tool.value)}
            className={`group relative flex size-10 items-center justify-center rounded-xl text-lg transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${activeTool === tool.value ? "bg-teal-50 text-teal-700 shadow-sm dark:bg-teal-900/30 dark:text-teal-300" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100"}`}
          >
            <span aria-hidden="true" className={tool.label === "Text" ? "text-sm font-semibold" : "leading-none"}>
              {tool.icon}
            </span>
          </button>
        ))}
      </nav>
      <div className="flex flex-col gap-1 border-t border-slate-200 pt-1 dark:border-slate-700">
        <label className="relative flex size-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100" title="Background Color">
          <span className="sr-only">Background Color</span>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M3 12h18" />
            <path d="M5 5h14v14H5z" />
          </svg>
          <span aria-hidden="true" className="absolute bottom-1.5 h-1 w-5 rounded-full border border-slate-400/40" style={{ backgroundColor: canvasSettings.backgroundColor }} />
          <input
            type="color"
            aria-label="Background Color"
            title="Background Color"
            value={canvasSettings.backgroundColor}
            onChange={(event) => onUpdateCanvasSettings({ ...canvasSettings, backgroundColor: event.target.value })}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <label className="relative flex size-10 cursor-pointer items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-teal-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-100" title="Text Color">
          <span className="sr-only">Text Color</span>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 3 3 18M15 3 9 21M4 8h16M3 16h16" />
          </svg>
          <span
            aria-hidden="true"
            className={`absolute bottom-1.5 h-1 w-5 rounded-full border border-slate-400/40 ${hasMixedTextColors ? "bg-[linear-gradient(90deg,#ef4444_0_33%,#22c55e_33%_66%,#3b82f6_66%)]" : ""}`}
            style={hasMixedTextColors ? undefined : { backgroundColor: textColor || "#0f172a" }}
          />
          <input
            type="color"
            aria-label="Text Color"
            title="Text Color"
            value={textColor || "#0f172a"}
            onChange={(event) => onUpdateTextColor(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
      />
    </aside>
  );
}
