import type { WhiteboardElement } from "@/types/canvas";

type ImageSectionProps = {
  isSingleImage: boolean;
  imageElement: (WhiteboardElement & { type: "image" }) | null;
  hasImages: boolean;
  imageOpacity: number | "mixed" | undefined;
  imageStrokeColor: string | "mixed" | undefined;
  imageStrokeWidth: number | "mixed" | undefined;
  imageCornerRadius: number | "mixed" | undefined;
  localOpacity: number | null;
  localCornerRadius: number | null;
  setLocalOpacity: (val: number | null) => void;
  setLocalCornerRadius: (val: number | null) => void;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>, commitHistory?: boolean) => void;
  onStartCrop?: () => void;
};

export function ImageSection({
  isSingleImage,
  imageElement,
  hasImages,
  imageOpacity,
  imageStrokeColor,
  imageStrokeWidth,
  imageCornerRadius,
  localOpacity,
  localCornerRadius,
  setLocalOpacity,
  setLocalCornerRadius,
  isLocked,
  onUpdateProperties,
  onStartCrop,
}: ImageSectionProps) {
  return (
    hasImages && (
      <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Image</h3>

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
          <label className="text-sm text-slate-600 dark:text-slate-400">Border Color</label>
          <div className="flex items-center gap-2">
            {imageStrokeColor === "mixed" ? (
              <span className="text-xs text-slate-400 italic dark:text-slate-500">Mixed</span>
            ) : null}
            <input
              type="color"
              value={imageStrokeColor !== "mixed" && imageStrokeColor ? imageStrokeColor : "#000000"}
              onChange={(e) => onUpdateProperties({ strokeColor: e.target.value })}
              disabled={isLocked || imageStrokeColor === "mixed"}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
              title="Border Color"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600 dark:text-slate-400">Border Width</label>
          <div className="flex items-center gap-2">
            {imageStrokeWidth === "mixed" ? (
              <span className="text-xs text-slate-400 italic dark:text-slate-500">Mixed</span>
            ) : null}
            <select
              value={imageStrokeWidth !== "mixed" ? imageStrokeWidth : 0}
              onChange={(e) => onUpdateProperties({ strokeWidth: Number(e.target.value) })}
              disabled={isLocked || imageStrokeWidth === "mixed"}
              className="border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
            >
              {imageStrokeWidth === "mixed" && <option value="" disabled>Mixed</option>}
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="8">8</option>
              <option value="10">10</option>
              <option value="12">12</option>
              <option value="15">15</option>
              <option value="20">20</option>
            </select>
            <span className="text-xs text-slate-500 dark:text-slate-400">px</span>
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

        {isSingleImage && imageElement && (
          <>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600 dark:text-slate-400">Width</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={Math.round(imageElement.width)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1) return;
                    if (imageElement.maintainAspectRatio) {
                      const ratio = imageElement.naturalHeight / imageElement.naturalWidth;
                      onUpdateProperties({ width: val, height: val * ratio });
                    } else {
                      onUpdateProperties({ width: val });
                    }
                  }}
                  disabled={isLocked}
                  className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">px</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600 dark:text-slate-400">Height</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={Math.round(imageElement.height)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1) return;
                    if (imageElement.maintainAspectRatio) {
                      const ratio = imageElement.naturalWidth / imageElement.naturalHeight;
                      onUpdateProperties({ height: val, width: val * ratio });
                    } else {
                      onUpdateProperties({ height: val });
                    }
                  }}
                  disabled={isLocked}
                  className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">px</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600 dark:text-slate-400">Maintain Aspect Ratio</label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={imageElement.maintainAspectRatio ?? true}
                  onChange={(e) => onUpdateProperties({ maintainAspectRatio: e.target.checked })}
                  disabled={isLocked}
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-disabled:opacity-50 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600 dark:text-slate-400">Rotation</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const current = imageElement.rotation || 0;
                    onUpdateProperties({ rotation: current - Math.PI / 2 });
                  }}
                  disabled={isLocked}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                  title="Rotate Left (-90°)"
                >
                  ⟲
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = imageElement.rotation || 0;
                    onUpdateProperties({ rotation: current + Math.PI / 2 });
                  }}
                  disabled={isLocked}
                  className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                  title="Rotate Right (+90°)"
                >
                  ⟳
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onUpdateProperties({ flipX: !(imageElement.flipX ?? false) })}
                disabled={isLocked}
                className={`flex-1 text-center py-1.5 px-2 border rounded text-sm transition-colors ${
                  imageElement.flipX ? "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-900/30 dark:text-teal-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Flip Horizontal
              </button>
              <button
                type="button"
                onClick={() => onUpdateProperties({ flipY: !(imageElement.flipY ?? false) })}
                disabled={isLocked}
                className={`flex-1 text-center py-1.5 px-2 border rounded text-sm transition-colors ${
                  imageElement.flipY ? "border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-500 dark:bg-teal-900/30 dark:text-teal-300" : "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Flip Vertical
              </button>
            </div>

            <div className="flex flex-col gap-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (onStartCrop) onStartCrop();
                }}
                disabled={isLocked}
                className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Crop
              </button>
              <button
                type="button"
                onClick={() => {
                  const w = imageElement.initialWidth || imageElement.naturalWidth;
                  const h = imageElement.initialHeight || imageElement.naturalHeight;
                  onUpdateProperties({ width: w, height: h });
                }}
                disabled={isLocked}
                className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Size
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateProperties({ rotation: 0 });
                }}
                disabled={isLocked || (imageElement.rotation || 0) === 0}
                className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Rotation
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateProperties({ flipX: false, flipY: false });
                }}
                disabled={isLocked || (!(imageElement.flipX ?? false) && !(imageElement.flipY ?? false))}
                className="w-full text-center py-1.5 px-3 border border-slate-200 rounded text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Reset Flips
              </button>
            </div>
          </>
        )}
      </div>
    )
  );
}
