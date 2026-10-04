import type { WhiteboardElement } from "@/types/canvas";

type ImageElement = WhiteboardElement & { type: "image" };

type ImageActionsProps = {
  imageElement: ImageElement;
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>, commitHistory?: boolean) => void;
  onStartCrop?: () => void;
};

export function ImageActions({ imageElement, isLocked, onUpdateProperties, onStartCrop }: ImageActionsProps) {
  return (
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
  );
}
