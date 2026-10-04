export function HeroVisual() {
  return (
    <div className="relative z-20">
      {/* Decorative doodles around whiteboard */}
      <svg className="absolute -top-10 left-1/4 w-12 h-12 text-[#0097a7]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 10 70 Q 40 10 90 90 Q 110 50 120 20" />
      </svg>

      <svg className="absolute top-1/4 -right-10 w-12 h-12 text-teal-300 opacity-60" viewBox="0 0 100 100" fill="none">
        <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="4" />
      </svg>

      {/* Whiteboard mock */}
      <div className="relative rounded-2xl bg-white border border-teal-200/80 dark:bg-slate-800 dark:border-slate-700 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col h-[520px]">
        {/* Mini header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 shrink-0 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 dark:text-slate-200 -rotate-6">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
            <span className="text-[13px] font-bold text-slate-800 tracking-tight dark:text-slate-200">SketchFlow</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Undo/Redo */}
            <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
              <div className="w-5 h-5 flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M3 13c0-4.97 4.03-9 9-9a9 9 0 0 1 0 18H3" />
                </svg>
              </div>
              <div className="w-5 h-5 flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6" />
                  <path d="M21 13c0 4.97-4.03 9-9 9a9 9 0 0 1 0-18h9" />
                </svg>
              </div>
            </div>
            {/* Avatar group - doodle characters */}
            <div className="flex -space-x-1.5 hidden sm:flex">
              <div className="w-6 h-6 rounded-full border border-white bg-slate-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="24" cy="20" r="12" fill="#fef3c7"/>
                  <circle cx="20" cy="19" r="2.5" fill="#1e293b"/>
                  <circle cx="28" cy="19" r="2.5" fill="#1e293b"/>
                  <path d="M17 18h6M25 18h6" />
                  <path d="M16 20c1.5-1 3-1 4.5 0M27.5 20c1.5-1 3-1 4.5 0" />
                  <path d="M12 32c4 4 12 4 16 0" />
                </svg>
              </div>
              <div className="w-6 h-6 rounded-full border border-white bg-slate-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="24" cy="20" r="12" fill="#e0f2fe"/>
                  <path d="M12 16c0-6 6-10 12-10s12 4 12 10" />
                  <circle cx="20" cy="19" r="2" fill="#1e293b"/>
                  <circle cx="28" cy="19" r="2" fill="#1e293b"/>
                  <path d="M22 25c1.5 1 2.5 1 4 0" />
                  <path d="M14 32c4 4 12 4 16 0" />
                </svg>
              </div>
              <div className="w-6 h-6 rounded-full border border-white bg-slate-50 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="24" cy="22" r="11" fill="#dcfce7"/>
                  <path d="M10 16c0-5 7-8 14-8s14 3 14 8" fill="#a3e635" fillOpacity="0.3"/>
                  <path d="M8 16h32" />
                  <circle cx="20" cy="21" r="2" fill="#1e293b"/>
                  <circle cx="28" cy="21" r="2" fill="#1e293b"/>
                  <path d="M14 34c4 3 12 3 16 0" />
                </svg>
              </div>
            </div>
            {/* Action buttons */}
            <button className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-[11px] font-semibold hover:bg-teal-700">
              Share
            </button>
            <button className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-semibold dark:bg-slate-700 dark:text-slate-300">
              Export
            </button>
            <button className="w-6 h-6 rounded flex items-center justify-center text-slate-400 dark:text-slate-500">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-1 relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]">
          {/* Vertical Toolbar */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-10 py-3 bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col items-center gap-2 z-10">
            <div className="w-8 h-8 rounded-lg bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4 3l4 18l3.5-7.5l7.5-3.5z" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-lg text-slate-500 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            </div>
            <div className="w-8 h-8 rounded-lg text-slate-500 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-lg text-slate-500 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-lg text-slate-500 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-lg text-slate-500 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 7V4h16v3M9 20h6M12 4v16" />
              </svg>
            </div>
            <div className="w-8 h-8 rounded-lg text-slate-500 flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          </div>

          {/* Canvas Elements */}
          <div className="absolute inset-0 p-8 pl-16">
            {/* Pink sticky top left */}
            <div className="absolute top-12 left-[70px] w-[90px] h-[100px] bg-[#f4e8ff] border border-[#d8b4fe] rounded shadow-sm rotate-2 flex flex-col items-center justify-center gap-2 p-2">
              <span className="text-[14px] text-[#581c87] font-medium" style={{ fontFamily: 'var(--font-doodle, cursive)' }}>Ideas</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b21a8" strokeWidth="1.5">
                <path d="M9 18h6M10 22h4M12 2v1M12 7a5 5 0 1 0-4.54 7.22l-.46 1.78a2 2 0 0 0 1.94 2.5h2.12a2 2 0 0 0 1.94-2.5l-.46-1.78A5 5 0 0 0 12 7z" />
              </svg>
            </div>

            {/* Arrow 1 */}
            <svg className="absolute top-[75px] left-[180px] w-11 h-11 text-slate-800 dark:text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h16M14 7l5 5-5 5" />
            </svg>

            {/* Plan Rectangle */}
            <div className="absolute top-[55px] left-[250px] w-[100px] h-[50px] bg-[#e0f2fe] border border-[#7dd3fc] rounded-sm shadow-sm flex items-center justify-center">
              <span className="text-[14px] text-[#0369a1] font-medium tracking-wide">Plan</span>
            </div>

            {/* Arrow 2 (Down from Plan) */}
            <svg className="absolute top-[115px] left-[285px] w-9 h-11 text-slate-800 dark:text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v16M7 13l5 5 5-5" />
            </svg>

            {/* Design Oval */}
            <div className="absolute top-[165px] left-[160px] w-[120px] h-[60px] bg-[#dcfce7] border border-[#4ade80] rounded-[50%] shadow-sm flex items-center justify-center">
              <span className="text-[15px] text-[#166534] font-medium tracking-wide">Design</span>
            </div>

            {/* Arrow 3 (Right from Design) */}
            <svg className="absolute top-[180px] left-[295px] w-11 h-11 text-slate-800 dark:text-slate-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h16M14 7l5 5-5 5" />
            </svg>

            {/* Build Rectangle */}
            <div className="absolute top-[170px] left-[360px] w-[100px] h-[50px] bg-[#fef3c7] border border-[#fcd34d] rounded-sm shadow-sm flex items-center justify-center">
              <span className="text-[14px] text-[#92400e] font-medium tracking-wide">Build</span>
            </div>

            {/* Arrow 4 (Down from Build) */}
            <svg className="absolute top-[235px] left-[385px] w-11 h-11 text-slate-800 dark:text-slate-200 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4l16 16M13 20l7 0 0-7" />
            </svg>

            {/* Launch Rectangle */}
            <div className="absolute top-[285px] left-[330px] w-[110px] h-[50px] bg-[#fce7f3] border border-[#f472b6] rounded-sm shadow-sm flex items-center justify-center relative">
              <span className="text-[14px] text-[#831843] font-medium tracking-wide">Launch</span>
              <svg className="absolute -right-11 top-0 w-9 h-9 text-slate-800 dark:text-slate-200 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
              </svg>
            </div>

            {/* Bottom Left pink sticky */}
            <div className="absolute bottom-8 left-14 w-[95px] h-[110px] bg-[#fce7f3] border border-[#fbcfe8] shadow-sm -rotate-2 p-3 flex flex-col justify-center">
              <span className="text-[12px] text-[#831843] font-medium leading-[1.4] text-center" style={{ fontFamily: 'var(--font-doodle, cursive)' }}>Think<br/>Sketch<br/>Connect<br/>Build</span>
            </div>

            {/* Top Right green sticky */}
            <div className="absolute top-14 right-12 w-[100px] h-[110px] bg-[#dcfce7] border border-[#bbf7d0] shadow-sm rotate-2 p-3 flex flex-col justify-center items-center">
              <span className="text-[13px] text-[#14532d] font-medium leading-[1.4] text-center" style={{ fontFamily: 'var(--font-doodle, cursive)' }}>Better<br/>Ideas<br/>Together!</span>
              <svg className="absolute -top-6 -right-4 w-9 h-9 text-slate-800 dark:text-slate-200 rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 19L5 7L12 11L19 7L22 19H2Z" />
              </svg>
            </div>

            {/* Random curved arrows */}
            <svg className="absolute top-[150px] left-[110px] w-11 h-11 text-slate-500 dark:text-slate-400 -rotate-[20deg]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 20c-4-4-4-10 0-14" />
              <path d="M5 10l4 -4l4 4" />
            </svg>

            <svg className="absolute bottom-[50px] left-[240px] w-11 h-11 text-slate-500 dark:text-slate-400 rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 20c-4-4-4-10 0-14" />
              <path d="M5 10l4 -4l4 4" />
            </svg>
          </div>

          {/* Bottom Zoom Controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-white rounded-lg shadow-sm border border-slate-200 px-2 py-1 z-10">
            <button className="w-5 h-5 flex items-center justify-center text-slate-700 hover:bg-slate-50 rounded">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.5 2C10.5 1.17 9.83.5 9 .5C8.17.5 7.5 1.17 7.5 2V8.5H6.5V3C6.5 2.17 5.83 1.5 5 1.5C4.17 1.5 3.5 2.17 3.5 3V9.5H2.5V4.5C2.5 3.67 1.83 3 1 3C0.17 3 -0.5 3.67 -0.5 4.5V14.5C-0.5 19.74 3.76 24 9 24C14.24 24 18.5 19.74 18.5 14.5V7C18.5 6.17 17.83 5.5 17 5.5C16.17 5.5 15.5 6.17 15.5 7V10.5H14.5V4C14.5 3.17 13.83 2.5 13 2.5C12.17 2.5 11.5 3.17 11.5 4V11.5H10.5V2Z" transform="translate(2 0) scale(0.8)" />
              </svg>
            </button>
            <div className="w-[1px] h-3 bg-slate-200 mx-0.5"></div>
            <button className="w-4 h-4 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 12h14" />
              </svg>
            </button>
            <span className="text-[11px] font-medium text-slate-600 w-8 text-center tabular-nums">100%</span>
            <button className="w-4 h-4 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <div className="w-[1px] h-3 bg-slate-200 mx-0.5"></div>
            <button className="w-4 h-4 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
