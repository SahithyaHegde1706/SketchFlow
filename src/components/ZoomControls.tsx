export function ZoomControls() {
  return (
    <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <button
        type="button"
        aria-label="Zoom out"
        title="Zoom out"
        className="flex size-8 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <span aria-hidden="true">−</span>
      </button>
      <span className="min-w-14 px-2 text-center text-xs font-semibold tabular-nums text-slate-700">
        100%
      </span>
      <button
        type="button"
        aria-label="Zoom in"
        title="Zoom in"
        className="flex size-8 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600"
      >
        <span aria-hidden="true">+</span>
      </button>
    </div>
  );
}
