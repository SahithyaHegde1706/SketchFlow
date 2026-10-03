import type { WhiteboardElement } from "@/types/canvas";

type TransformSectionProps = {
  rotationDegrees: number | "mixed";
  isLocked: boolean;
  onUpdateProperties: (updates: Partial<WhiteboardElement>) => void;
};

export function TransformSection({ rotationDegrees, isLocked, onUpdateProperties }: TransformSectionProps) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Transform</h3>
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Rotation</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={rotationDegrees !== "mixed" ? rotationDegrees : ""}
            placeholder={rotationDegrees === "mixed" ? "Mixed" : "0"}
            onChange={(e) => {
              const deg = parseFloat(e.target.value);
              if (!isNaN(deg)) {
                onUpdateProperties({ rotation: deg * (Math.PI / 180) });
              }
            }}
            disabled={isLocked}
            className="w-20 border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 disabled:opacity-40 disabled:cursor-not-allowed dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
          />
          <span className="text-xs text-slate-500 dark:text-slate-400">°</span>
        </div>
      </div>
    </div>
  );
}
