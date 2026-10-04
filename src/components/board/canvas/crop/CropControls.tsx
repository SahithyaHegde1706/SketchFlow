type CropControlsProps = {
  onCancel: () => void;
  onApply: () => void;
};

export function CropControls({ onCancel, onApply }: CropControlsProps) {
  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 bg-white shadow-lg rounded-xl p-2 border border-slate-200">
      <button
        onClick={onCancel}
        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onApply}
        className="px-4 py-1.5 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 transition-colors"
      >
        Apply Crop
      </button>
    </div>
  );
}
