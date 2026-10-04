type ActionsSectionProps = {
  allLocked: boolean;
  selectedElementsCount: number;
  onSetLocked: (locked: boolean) => void;
};

export function ActionsSection({ allLocked, selectedElementsCount, onSetLocked }: ActionsSectionProps) {
  return (
    <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-700">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</h3>
      <div className="flex items-center justify-between">
        <label className="text-sm text-slate-600 dark:text-slate-400">Lock</label>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={allLocked}
            onChange={(e) => onSetLocked(e.target.checked)}
            disabled={selectedElementsCount === 0}
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-disabled:opacity-50 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
        </label>
      </div>
    </div>
  );
}
