import type { Tool } from "@/types/canvas";

const tools = [
  { label: "Select", icon: "↖", value: "select" },
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
};

import { useRef } from "react";

export function ToolRail({ activeTool, onToolSelect, onImageSelect }: ToolRailProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToolClick = (toolValue: Tool) => {
    if (toolValue === "image") {
      fileInputRef.current?.click();
    }
    onToolSelect(toolValue);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (onImageSelect) {
      onImageSelect(file);
    }
    
    // reset the input
    e.target.value = "";
  };

  return (
    <aside className="absolute left-4 top-4 z-10 flex flex-col gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:left-6 md:top-6">
      <nav aria-label="Whiteboard tools" className="flex flex-col gap-1">
        {tools.map((tool) => (
          <button
            key={tool.label}
            type="button"
            aria-label={tool.label}
            title={tool.label}
            aria-pressed={activeTool === tool.value}
            onClick={() => handleToolClick(tool.value)}
            className={`group relative flex size-10 items-center justify-center rounded-xl text-lg transition focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${activeTool === tool.value ? "bg-teal-50 text-teal-700 shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
          >
            <span aria-hidden="true" className={tool.label === "Text" ? "text-sm font-semibold" : "leading-none"}>
              {tool.icon}
            </span>
          </button>
        ))}
      </nav>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
      />
      <div className="mx-2 my-1 h-px bg-slate-200" />
      <button
        type="button"
        aria-label="Current color: ink"
        title="Current color"
        className="flex size-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <span aria-hidden="true" className="size-4 rounded-full border-2 border-white bg-slate-900 shadow-[0_0_0_1px_#cbd5e1]" />
      </button>
    </aside>
  );
}
