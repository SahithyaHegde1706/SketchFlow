import type { ComponentProps } from "react";
import type { AlignOperation } from "@/types/canvas";

type AlignControlsProps = Omit<ComponentProps<"div">, "children"> & {
  canAlign: boolean;
  canDistribute: boolean;
  onAlign: (operation: AlignOperation) => void;
};

export function AlignControls({
  canAlign,
  canDistribute,
  onAlign,
  ...props
}: AlignControlsProps) {
  return (
    <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-2" {...props}>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => onAlign("align-left")}
          title="Align Left"
          aria-label="Align left"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 2V14M6 4H13V7H6V4ZM6 9H10V12H6V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => onAlign("align-center")}
          title="Align Center"
          aria-label="Align center"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 2V14M4 4H12V7H4V4ZM5 9H11V12H5V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => onAlign("align-right")}
          title="Align Right"
          aria-label="Align right"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2V14M3 4H10V7H3V4ZM6 9H10V12H6V9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1 ml-1">
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => onAlign("align-top")}
          title="Align Top"
          aria-label="Align top"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3H14M4 6V13H7V6H4ZM9 6V10H12V6H9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => onAlign("align-middle")}
          title="Align Middle"
          aria-label="Align middle"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 8H14M4 4V12H7V4H4ZM9 5V11H12V5H9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          disabled={!canAlign}
          onClick={() => onAlign("align-bottom")}
          title="Align Bottom"
          aria-label="Align bottom"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 13H14M4 3V10H7V3H4ZM9 6V10H12V6H9Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1 ml-1">
        <button
          type="button"
          disabled={!canDistribute}
          onClick={() => onAlign("distribute-horizontal")}
          title="Distribute Horizontally"
          aria-label="Distribute horizontally"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2V14M14 2V14M5 5H7V11H5V5ZM9 6H11V10H9V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          type="button"
          disabled={!canDistribute}
          onClick={() => onAlign("distribute-vertical")}
          title="Distribute Vertically"
          aria-label="Distribute vertically"
          className="inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-700"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2H14M2 14H14M5 5V7H11V5H5ZM6 9V11H10V9H6Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
