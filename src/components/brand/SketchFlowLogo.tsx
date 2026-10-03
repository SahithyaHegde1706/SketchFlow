import Link from "next/link";

type SketchFlowLogoProps = {
  href?: string;
};

export function SketchFlowLogo({ href }: SketchFlowLogoProps) {
  const logo = (
    <span className="flex items-center gap-2">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-900 dark:text-slate-50 -rotate-6">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
      <span className="text-[15px] font-bold tracking-tight text-slate-950 dark:text-slate-50">
        SketchFlow
      </span>
    </span>
  );

  return href ? <Link href={href}>{logo}</Link> : logo;
}
