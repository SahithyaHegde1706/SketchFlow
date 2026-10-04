import Link from "next/link";

export function HeroContent() {
  return (
    <div className="relative z-10 lg:pr-2">
      {/* Decorative doodle bottom left - extended downward */}
      <svg className="absolute -bottom-36 -left-20 w-28 h-44 text-green-400 opacity-60" viewBox="0 0 100 160" fill="none">
        <path d="M 0 160 C 20 130, 50 120, 70 80 C 80 60, 90 40, 100 20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 10 160 C 30 140, 55 130, 75 90 C 85 70, 92 50, 98 35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>

      <p className="text-[15px] font-medium text-teal-600 mb-4 tracking-wide dark:text-teal-400">
        Collaborative Whiteboard for Everyone
      </p>

      {/* Heading */}
      <h1 className="text-[clamp(2.5rem,9vw,3.625rem)] lg:text-[72px] font-[800] tracking-tight text-slate-900 leading-[1.05] mb-5 font-sans dark:text-slate-50">
        Turn ideas into<br />
        <span className="relative text-teal-600 inline-block mt-2 dark:text-teal-400">
          visual reality.
          {/* Teal squiggly to the right */}
          <svg className="absolute top-[40%] -right-11 w-8 h-8 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12c3-4 6 4 9 0c3-4 6 4 9 0" />
            <path d="M2 17c3-4 6 4 9 0c3-4 6 4 9 0" />
          </svg>
        </span>
      </h1>

      {/* Description */}
      <p className="text-[17px] sm:text-[18px] text-slate-600 mb-7 max-w-lg leading-relaxed dark:text-slate-400">
        A fast, intuitive online whiteboard for sketching ideas,
        planning projects, and bringing concepts to life.
      </p>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 mb-8">
        <Link
          href="/board"
          className="inline-flex items-center gap-1.5 rounded-[12px] bg-teal-600 px-9 py-4.5 text-[17px] font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          Start Drawing
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* User avatars */}
      <div className="flex items-center gap-6 relative">
        <div className="flex -space-x-2">
          {/* Character 1: With glasses */}
          <div className="w-14 h-14 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="24" cy="20" r="12" fill="#fef3c7"/>
              <circle cx="20" cy="19" r="2.5" fill="#1e293b"/>
              <circle cx="28" cy="19" r="2.5" fill="#1e293b"/>
              <path d="M17 18h6M25 18h6" />
              <path d="M16 20c1.5-1 3-1 4.5 0M27.5 20c1.5-1 3-1 4.5 0" />
              <path d="M12 32c4 4 12 4 16 0" />
            </svg>
          </div>
          {/* Character 2: Short hair */}
          <div className="w-14 h-14 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="24" cy="20" r="12" fill="#e0f2fe"/>
              <path d="M12 16c0-6 6-10 12-10s12 4 12 10" />
              <circle cx="20" cy="19" r="2" fill="#1e293b"/>
              <circle cx="28" cy="19" r="2" fill="#1e293b"/>
              <path d="M22 25c1.5 1 2.5 1 4 0" />
              <path d="M14 32c4 4 12 4 16 0" />
            </svg>
          </div>
          {/* Character 3: Long hair */}
          <div className="w-14 h-14 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="24" cy="22" r="11" fill="#dcfce7"/>
              <path d="M10 16c0-5 7-8 14-8s14 3 14 8" fill="#a3e635" fillOpacity="0.3"/>
              <path d="M8 16h32" />
              <circle cx="20" cy="21" r="2" fill="#1e293b"/>
              <circle cx="28" cy="21" r="2" fill="#1e293b"/>
              <path d="M14 34c4 3 12 3 16 0" />
            </svg>
          </div>
          {/* Character 4: With cap */}
          <div className="w-14 h-14 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="24" cy="22" r="11" fill="#dcfce7"/>
              <path d="M10 16c0-5 7-8 14-8s14 3 14 8" fill="#a3e635" fillOpacity="0.3"/>
              <path d="M8 16h32" />
              <circle cx="20" cy="21" r="2" fill="#1e293b"/>
              <circle cx="28" cy="21" r="2" fill="#1e293b"/>
              <path d="M14 34c4 3 12 3 16 0" />
            </svg>
          </div>
        </div>
        <p className="text-[14px] text-slate-500 leading-snug dark:text-slate-400">
          Used by students, developers<br />and creative minds.
        </p>

        {/* Teal curved arrow pointing up-right */}
        <svg className="absolute -bottom-8 right-6 w-14 h-14 text-[#0097a7]" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M 10 90 Q 60 90 90 20" />
          <path d="M 65 25 L 90 20 L 95 45" />
        </svg>
      </div>
    </div>

  );
}
