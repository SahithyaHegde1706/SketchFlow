import type { WhiteboardElement } from "@/types/canvas";

type ImageStyleControlsProps = {
  imageOpacity: number | "mixed" | undefined;
  imageCornerRadius: number | "mixed" | undefined;
  localOpacity: number | null;
  localCornerRadius: number | null;
  setLocalOpacity: (val: number | null) => void;
  setLocalCornerRadius: (val: number | null) => void;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>, commitHistory?: boolean) => void;
};

export function ImageStyleControls({
  imageOpacity,
  imageCornerRadius,
  localOpacity,
  localCornerRadius,
  setLocalOpacity,
  setLocalCornerRadius,
  isLocked,
  onUpdateProperties,
}: ImageStyleControlsProps) {
  return (
    <>
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Opacity</label>
        <div className="flex items-center gap-2">
          {imageOpacity === "mixed" ? (
            <span className="text-xs text-slate-400 italic w-8 text-right dark:text-slate-500">Mixed</span>
          ) : (
            <>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={localOpacity !== null ? localOpacity : (imageOpacity ?? 100)}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setLocalOpacity(val);
                  onUpdateProperties({ opacity: val / 100 }, false);
                }}
                onPointerUp={() => {
                  if (localOpacity !== null) {
                    onUpdateProperties({ opacity: localOpacity / 100 }, true);
                    setLocalOpacity(null);
                  }
                }}
                disabled={isLocked}
                className="w-24 accent-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 w-8 text-right dark:text-slate-400">
                {localOpacity !== null ? localOpacity : (imageOpacity ?? 100)}%
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Corner Radius</label>
        <div className="flex items-center gap-2">
          {typeof imageCornerRadius === "string" ? (
            <span className="text-xs text-slate-400 italic dark:text-slate-500">Mixed</span>
          ) : (
            <>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={localCornerRadius !== null ? localCornerRadius : (imageCornerRadius ?? 0)}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setLocalCornerRadius(val);
                  onUpdateProperties({ cornerRadius: val }, false);
                }}
                onPointerUp={() => {
                  if (localCornerRadius !== null) {
                    onUpdateProperties({ cornerRadius: localCornerRadius }, true);
                    setLocalCornerRadius(null);
                  }
                }}
                disabled={isLocked || typeof imageCornerRadius === "string"}
                className="w-24 accent-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 w-8 text-right dark:text-slate-400">
                {localCornerRadius !== null ? localCornerRadius : (imageCornerRadius ?? 0)}px
              </span>
            </>
          )}
        </div>
      </div>
    </>
  );
}
