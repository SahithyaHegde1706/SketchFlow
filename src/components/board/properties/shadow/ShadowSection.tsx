import type { WhiteboardElement } from "@/types/canvas";

type ShadowSectionProps = {
  imageElement: WhiteboardElement & { type: "image" };
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>) => void;
};

export function ShadowSection({ imageElement, isLocked, onUpdateProperties }: ShadowSectionProps) {
  return (
    <div className="space-y-3 pt-2 border-t border-slate-100">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Shadow</h3>

      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600">Enable Shadow</label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={imageElement.shadowColor !== undefined}
            onChange={(e) => {
              if (e.target.checked) {
                onUpdateProperties({
                  shadowColor: "#000000",
                  shadowBlur: 10,
                  shadowOffsetX: 5,
                  shadowOffsetY: 5
                });
              } else {
                onUpdateProperties({
                  shadowColor: undefined,
                  shadowBlur: undefined,
                  shadowOffsetX: undefined,
                  shadowOffsetY: undefined
                });
              }
            }}
            disabled={isLocked}
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-disabled:opacity-50"></div>
        </label>
      </div>

      {imageElement.shadowColor !== undefined && (
        <>
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Shadow Color</label>
            <input
              type="color"
              value={imageElement.shadowColor ?? "#000000"}
              onChange={(e) => onUpdateProperties({ shadowColor: e.target.value })}
              disabled={isLocked}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent disabled:opacity-40 disabled:cursor-not-allowed"
              title="Shadow Color"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Blur</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={imageElement.shadowBlur ?? 10}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onUpdateProperties({ shadowBlur: val });
                }}
                disabled={isLocked}
                className="w-24 accent-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 w-8 text-right">
                {imageElement.shadowBlur ?? 10}px
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Offset X</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={imageElement.shadowOffsetX ?? 5}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onUpdateProperties({ shadowOffsetX: val });
                }}
                disabled={isLocked}
                className="w-24 accent-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 w-8 text-right">
                {imageElement.shadowOffsetX ?? 5}px
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600">Offset Y</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="-50"
                max="50"
                step="1"
                value={imageElement.shadowOffsetY ?? 5}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  onUpdateProperties({ shadowOffsetY: val });
                }}
                disabled={isLocked}
                className="w-24 accent-teal-500 disabled:opacity-40 disabled:cursor-not-allowed"
              />
              <span className="text-xs text-slate-500 w-8 text-right">
                {imageElement.shadowOffsetY ?? 5}px
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
