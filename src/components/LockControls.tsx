type LockControlsProps = {
  canLock: boolean;
  canUnlock: boolean;
  onLock: () => void;
  onUnlock: () => void;
};

export function LockControls({
  canLock,
  canUnlock,
  onLock,
  onUnlock,
}: LockControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onLock}
        disabled={!canLock}
        aria-label="Lock selection"
        title="Lock selection (Ctrl+Shift+L)"
        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onUnlock}
        disabled={!canUnlock}
        aria-label="Unlock selection"
        title="Unlock selection (Ctrl+Shift+U)"
        className="inline-flex size-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-600"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      </button>
    </div>
  );
}
