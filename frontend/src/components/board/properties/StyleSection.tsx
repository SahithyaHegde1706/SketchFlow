import type { WhiteboardElement } from "@/types/canvas";
import { useState } from "react";

type StyleSectionProps = {
  hasFillable: boolean;
  fillColor: string | "mixed" | undefined;
  hasRoundedRectangle: boolean;
  radius: number | "mixed" | undefined;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>) => void;
};

export function StyleSection({
  hasFillable,
  fillColor,
  hasRoundedRectangle,
  radius,
  isLocked,
  onUpdateProperties,
}: StyleSectionProps) {
  const [lastFillColor, setLastFillColor] = useState<string | null>(null);
  const currentFillColor = fillColor && fillColor !== "mixed" && fillColor !== "transparent" && fillColor !== "none"
    ? fillColor
    : null;

  return (
    (hasFillable || hasRoundedRectangle) && (
      <div className="space-y-4">
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
                  onChange={(e) => {
                    setLastFillColor(e.target.value);
                    onUpdateProperties({ fillColor: e.target.value });
                  }}
                  disabled={isLocked || fillColor === "transparent" || fillColor === "none"}
                  className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Fill Color"
                />
                <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer dark:text-slate-400">
                  <input
                    type="checkbox"
                    checked={fillColor === "transparent" || fillColor === "none"}
                    onChange={(e) => {
                      if (e.target.checked) {
                        if (currentFillColor) setLastFillColor(currentFillColor);
                        onUpdateProperties({ fillColor: "transparent" });
                      } else {
                        onUpdateProperties({ fillColor: lastFillColor ?? "#ffffff" });
                      }
                    }}
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
