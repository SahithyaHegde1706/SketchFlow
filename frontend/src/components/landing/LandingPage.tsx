import { Navbar } from "./navbar/Navbar";
import { Hero } from "./hero/Hero";
import { Footer } from "./footer/Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen lg:h-screen lg:flex flex-col bg-white dark:bg-slate-900">
      <Navbar />
      <Hero />
      <Footer />
    </div>
  );
}
