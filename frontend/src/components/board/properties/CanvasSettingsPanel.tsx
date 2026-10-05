import type { CanvasSettings } from "@/types/canvas";

type CanvasSettingsPanelProps = {
  canvasSettings: CanvasSettings;
  onUpdateCanvasSettings: (settings: CanvasSettings) => void;
  onClose: () => void;
};

export function CanvasSettingsPanel({ canvasSettings, onUpdateCanvasSettings, onClose }: CanvasSettingsPanelProps) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2 dark:border-slate-700">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Canvas Settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-700"
          aria-label="Close Canvas Settings panel"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600 dark:text-slate-400">Grid</label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={canvasSettings.showGrid}
              onChange={(e) => onUpdateCanvasSettings({ ...canvasSettings, showGrid: e.target.checked })}
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
          </label>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-600 dark:text-slate-400">Grid Size</label>
          <select
            value={canvasSettings.gridSize}
            onChange={(e) => {
              const size = Number(e.target.value);
              onUpdateCanvasSettings({
                ...canvasSettings,
                gridSize: size,
                snapSettings: {
                  ...canvasSettings.snapSettings,
                  gridSize: size,
                },
              });
            }}
            className="border border-slate-200 rounded p-1 text-sm text-slate-700 focus:outline-none focus:border-teal-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-teal-500"
            disabled={!canvasSettings.showGrid && !(canvasSettings.snapSettings?.gridEnabled)}
          >
            <option value="8">8</option>
            <option value="16">16</option>
            <option value="24">24</option>
            <option value="32">32</option>
          </select>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-4 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Snapping</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={canvasSettings.snapSettings?.enabled ?? true}
                onChange={(e) => onUpdateCanvasSettings({
                  ...canvasSettings,
                  snapSettings: {
                    ...canvasSettings.snapSettings,
                    enabled: e.target.checked,
                  },
                })}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-600 dark:text-slate-400">Grid Snap</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={canvasSettings.snapSettings?.gridEnabled ?? false}
                onChange={(e) => onUpdateCanvasSettings({
                  ...canvasSettings,
                  snapSettings: {
                    ...canvasSettings.snapSettings,
                    gridEnabled: e.target.checked,
                  },
                })}
                disabled={!(canvasSettings.snapSettings?.enabled ?? true)}
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500 peer-disabled:opacity-50 dark:bg-slate-700 dark:peer-checked:bg-teal-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
