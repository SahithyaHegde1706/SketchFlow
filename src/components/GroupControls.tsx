import type { ComponentProps } from "react";

type GroupControlsProps = Omit<ComponentProps<"div">, "children"> & {
  canGroup: boolean;
  canUngroup: boolean;
  onGroup: () => void;
  onUngroup: () => void;
};

export function GroupControls({
  canGroup,
  canUngroup,
  onGroup,
  onUngroup,
  ...props
}: GroupControlsProps) {
  return (
    <div className="flex items-center gap-1" {...props}>
      <button
        type="button"
        disabled={!canGroup}
        onClick={onGroup}
        title="Group (Ctrl+G)"
        aria-label="Group selection"
        className="inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <rect x="14" y="14" width="6" height="6" rx="1" />
        </svg>
      </button>

      <button
        type="button"
        disabled={!canUngroup}
        onClick={onUngroup}
        title="Ungroup (Ctrl+Shift+G)"
        aria-label="Ungroup selection"
        className="inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <path d="M14 14h6v6h-6z" />
          <path d="M14 14l6 6" />
        </svg>
      </button>
    </div>
  );
}
