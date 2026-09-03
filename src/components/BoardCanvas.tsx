export function BoardCanvas() {
  return (
    <section
      aria-label="Whiteboard canvas placeholder"
      className="board-canvas relative min-h-0 flex-1 overflow-hidden bg-[#f8fafc]"
    >
      <div className="absolute inset-0 flex items-center justify-center px-24 text-center">
        <div className="max-w-xs rounded-2xl border border-dashed border-slate-300/80 bg-white/70 px-6 py-5 shadow-sm">
          <p className="text-sm font-medium text-slate-700">Your canvas is ready</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Choose a tool to begin shaping your ideas.
          </p>
        </div>
      </div>
    </section>
  );
}
