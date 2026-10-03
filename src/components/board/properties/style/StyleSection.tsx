import type { WhiteboardElement } from "@/types/canvas";

type StyleSectionProps = {
  allHaveStrokeColor: boolean;
  strokeColor: string | "mixed" | undefined;
  allHaveStrokeWidth: boolean;
  strokeWidth: number | "mixed" | undefined;
  hasFillable: boolean;
  fillColor: string | "mixed" | undefined;
  hasRoundedRectangle: boolean;
  radius: number | "mixed" | undefined;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>) => void;
};

export function StyleSection({
  allHaveStrokeColor,
  strokeColor,
  allHaveStrokeWidth,
  strokeWidth,
  hasFillable,
  fillColor,
  hasRoundedRectangle,
  radius,
  isLocked,
  onUpdateProperties,
}: StyleSectionProps) {
  return (
    (allHaveStrokeColor || allHaveStrokeWidth) && (
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Stroke</h3>

        {allHaveStrokeColor && (
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Color</label>
            <div className="flex items-center gap-2">
              {strokeColor === "mixed" ? (
                <span className="text-xs text-slate-400 italic dark:text-slate-500">Mixed</span>
              ) : null}
              <input
                type="color"
                value={strokeColor !== "mixed" && strokeColor ? strokeColor : "#000000"}
                onChange={(e) => onUpdateProperties({ strokeColor: e.target.value })}
                disabled={isLocked}
                className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                title="Stroke Color"
              />
            </div>
          </div>
        )}

        {allHaveStrokeWidth && (
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Width</label>
            <div className="flex items-center gap-2">
              {strokeWidth === "mixed" ? (
                <span className="text-xs text-slate-400 italic dark:text-slate-500">Mixed</span>
              ) : null}
              <select
                value={strokeWidth !== "mixed" ? strokeWidth : ""}
                onChange={(e) => onUpdateProperties({ strokeWidth: Number(e.target.value) })}
                disabled={isLocked}
                className="border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
              >
                {strokeWidth === "mixed" && <option value="" disabled>Mixed</option>}
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="6">6</option>
                <option value="8">8</option>
              </select>
            </div>
          </div>
        )}

        {hasFillable && (
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Fill</label>
            <div className="flex items-center gap-2">
              {fillColor === "mixed" ? (
                <span className="text-xs text-slate-400 italic dark:text-slate-500">Mixed</span>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={fillColor !== "mixed" && fillColor !== "transparent" && fillColor !== "none" && fillColor ? fillColor : "#ffffff"}
                  onChange={(e) => onUpdateProperties({ fillColor: e.target.value })}
                  disabled={isLocked || fillColor === "transparent" || fillColor === "none"}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Fill Color"
                />
                <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={fillColor === "transparent" || fillColor === "none"}
                    onChange={(e) => onUpdateProperties({ fillColor: e.target.checked ? "transparent" : "#ffffff" })}
                    disabled={isLocked}
                    className="cursor-pointer disabled:cursor-not-allowed"
                  />
                  None
                </label>
              </div>
            </div>
          </div>
        )}

        {hasRoundedRectangle && (
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Corner Radius</label>
            <div className="flex items-center gap-2">
              {radius === "mixed" ? (
                <span className="text-xs text-slate-400 italic dark:text-slate-500">Mixed</span>
              ) : null}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={radius !== "mixed" && radius !== undefined ? radius : ""}
                  placeholder={radius === "mixed" ? "Mixed" : "12"}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 0) onUpdateProperties({ radius: val });
                  }}
                  disabled={isLocked}
                  className="w-16 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">px</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  );
}
