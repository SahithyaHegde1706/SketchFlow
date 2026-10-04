import type { WhiteboardElement } from "@/types/canvas";

type ImageElement = WhiteboardElement & { type: "image" };

type ImageTransformControlsProps = {
  imageElement: ImageElement;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>, commitHistory?: boolean) => void;
};

export function ImageTransformControls({ imageElement, isLocked, onUpdateProperties }: ImageTransformControlsProps) {
  return (
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
    </>
  );
}
