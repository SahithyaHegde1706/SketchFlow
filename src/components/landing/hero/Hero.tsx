import { HeroContent } from "./HeroContent";
import { HeroVisual } from "./HeroVisual";

export function Hero() {
  return (
    <section className="flex-1 relative overflow-hidden bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-[1300px] px-4 sm:px-6 lg:px-8 h-full">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-10 items-center h-full">
          <HeroContent />
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
