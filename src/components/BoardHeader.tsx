const MoreIcon = () => <span aria-hidden="true">...</span>;

export function BoardHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-5 backdrop-blur md:px-7">
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-xl bg-teal-600 text-sm font-bold text-white shadow-sm shadow-teal-600/20">
            S
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-950">
            SketchFlow
          </span>
        </div>
        <span className="hidden h-5 w-px bg-slate-200 sm:block" />
        <p className="truncate text-sm text-slate-500">Untitled board</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-1 hidden text-xs text-slate-400 lg:block">
          Draw. Think. Collaborate.
        </span>
        <button
          type="button"
          aria-label="Share board"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <span aria-hidden="true" className="text-base leading-none">↗</span>
          <span className="hidden sm:inline">Share</span>
        </button>
        <button
          type="button"
          aria-label="More board options"
          title="More options"
          className="inline-flex size-9 items-center justify-center rounded-lg text-lg font-semibold tracking-[0.18em] text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
        >
          <MoreIcon />
        </button>
      </div>
    </header>
  );
}
