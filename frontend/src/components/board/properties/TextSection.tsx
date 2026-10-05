import type { WhiteboardElement } from "@/types/canvas";

type TextSectionProps = {
  textContent: string | "mixed" | undefined;
  fontSize: number | "mixed" | undefined;
  fontFamily: string | "mixed" | undefined;
  fontWeight: string | "mixed" | undefined;
  fontStyle: string | "mixed" | undefined;
  textDecoration: string | "mixed" | undefined;
  textAlign: string | "mixed" | undefined;
  lineHeight: number | "mixed" | undefined;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>) => void;
};

export function TextSection({
  textContent,
  fontSize,
  fontFamily,
  fontWeight,
  fontStyle,
  textDecoration,
  textAlign,
  lineHeight,
  isLocked,
  onUpdateProperties,
}: TextSectionProps) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Text</h3>

      <div className="space-y-2">
        <label className="text-sm text-slate-600 dark:text-slate-400">Content</label>
        {textContent === "mixed" ? (
          <div className="text-xs text-slate-400 italic p-2 border border-slate-100 rounded bg-slate-50 dark:text-slate-500 dark:border-slate-700 dark:bg-slate-800">Multiple text elements</div>
        ) : (
          <textarea
            value={textContent || ""}
            onChange={(e) => onUpdateProperties({ text: e.target.value })}
            disabled={isLocked}
            className="w-full border border-slate-200 rounded p-2 text-sm text-slate-700 min-h-[60px] resize-y focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
            placeholder="Empty text"
          />
        )}
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Font Size</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="8"
            step="2"
            value={fontSize !== "mixed" ? fontSize : ""}
            placeholder={fontSize === "mixed" ? "Mixed" : "20"}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (!isNaN(val) && val >= 8) onUpdateProperties({ fontSize: val });
            }}
            disabled={isLocked}
            className="w-16 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">px</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Font</label>
        <div className="flex items-center gap-2">
          <select
            value={fontFamily !== "mixed" ? fontFamily : ""}
            onChange={(e) => onUpdateProperties({ fontFamily: e.target.value })}
            disabled={isLocked}
            className="w-32 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
          >
            {fontFamily === "mixed" && <option value="" disabled>Mixed</option>}
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Style</label>
        <div className="flex items-center gap-1 border border-slate-200 rounded p-1 dark:border-slate-600">
          <button
            title="Bold"
            onClick={() => onUpdateProperties({ fontWeight: fontWeight === "bold" ? "normal" : "bold" })}
            disabled={isLocked}
            className={`w-7 h-7 flex items-center justify-center rounded font-bold disabled:opacity-40 disabled:cursor-not-allowed ${fontWeight === "bold" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
          >
            B
          </button>
          <button
            title="Italic"
            onClick={() => onUpdateProperties({ fontStyle: fontStyle === "italic" ? "normal" : "italic" })}
            disabled={isLocked}
            className={`w-7 h-7 flex items-center justify-center rounded italic disabled:opacity-40 disabled:cursor-not-allowed ${fontStyle === "italic" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
          >
            I
          </button>
          <button
            title="Underline"
            onClick={() => onUpdateProperties({ textDecoration: textDecoration === "underline" ? "none" : "underline" })}
            disabled={isLocked}
            className={`w-7 h-7 flex items-center justify-center rounded underline disabled:opacity-40 disabled:cursor-not-allowed ${textDecoration === "underline" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
          >
            U
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Align</label>
        <div className="flex items-center gap-1 border border-slate-200 rounded p-1 dark:border-slate-600">
          <button
            title="Left Align"
            onClick={() => onUpdateProperties({ textAlign: "left" })}
            disabled={isLocked}
            className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-40 disabled:cursor-not-allowed ${textAlign === "left" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="15" y2="12"></line><line x1="3" y1="18" x2="19" y2="18"></line></svg>
          </button>
          <button
            title="Center Align"
            onClick={() => onUpdateProperties({ textAlign: "center" })}
            disabled={isLocked}
            className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-40 disabled:cursor-not-allowed ${textAlign === "center" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="7" y1="12" x2="17" y2="12"></line><line x1="5" y1="18" x2="19" y2="18"></line></svg>
          </button>
          <button
            title="Right Align"
            onClick={() => onUpdateProperties({ textAlign: "right" })}
            disabled={isLocked}
            className={`w-7 h-7 flex items-center justify-center rounded disabled:opacity-40 disabled:cursor-not-allowed ${textAlign === "right" ? "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300" : "hover:bg-slate-100 text-slate-700 dark:hover:bg-slate-700 dark:text-slate-300"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="9" y1="12" x2="21" y2="12"></line><line x1="5" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Line Height</label>
        <div className="flex items-center gap-2">
          <select
            value={lineHeight !== "mixed" ? lineHeight : ""}
            onChange={(e) => onUpdateProperties({ lineHeight: Number(e.target.value) })}
            disabled={isLocked}
            className="w-16 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
          >
            {lineHeight === "mixed" && <option value="" disabled>Mixed</option>}
            <option value="1">1.0</option>
            <option value="1.2">1.2</option>
            <option value="1.5">1.5</option>
            <option value="1.8">1.8</option>
            <option value="2">2.0</option>
          </select>
        </div>
      </div>
    </div>
  );
}
