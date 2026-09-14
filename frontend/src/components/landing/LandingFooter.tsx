"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Code2, X as XIcon } from "lucide-react";
import { useLenis } from "lenis/react";
import BrandLogo from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

const footerLinks = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Covered Cities", href: "#cities" },
    ],
  },
  {
    heading: "Portals",
    links: [
      { label: "Book a Ticket", href: "/buy" },
      { label: "My Tickets", href: "/tickets" },
      { label: "Operator Dashboard", href: "/operator" },
    ],
  },
  {
    heading: "Project",
    links: [
      { label: "The Team", href: "#" },
      { label: "Documentation", href: "#" },
      { label: "Privacy Policy", href: "#" },
    ],
  },
];

export default function LandingFooter() {
  const lenis = useLenis();
  const pathname = usePathname();

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/") {
      e.preventDefault();
      const hero = document.getElementById("hero");
      if (lenis) {
        if (hero) {
          lenis.scrollTo(hero, { offset: 0, duration: 1.2 });
        } else {
          lenis.scrollTo(0, { duration: 1.2 });
        }
      } else {
        if (hero) {
          hero.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }
      if (window.location.hash) {
        window.history.pushState(null, "", "/");
      }
    }
  };

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) {
        if (lenis) {
          const offset = 0;
          lenis.scrollTo(el as HTMLElement, { offset, duration: 1.2 });
        } else {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-white/10 pt-12 pb-8 sm:pt-16 sm:pb-8 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-10 mb-12 sm:mb-14">
          {/* Brand col */}
          <div className="col-span-1 md:col-span-1 flex flex-col items-center md:items-start text-center md:text-left">
            <Link
              href="/#hero"
              onClick={handleLogoClick}
              className="mb-4 inline-flex items-center justify-center md:justify-start group"
              aria-label={`${BRAND.name} home`}
            >
              <BrandLogo
                showTagline
                className="transition-transform group-hover:scale-105"
                textClassName="text-xl font-bold text-white tracking-tight"
                taglineClassName="text-[0.65rem] font-semibold tracking-wide text-slate-400"
              />
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xs mx-auto md:mx-0">
              AI-powered smart boarding for inter-provincial bus terminals across ASEAN.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-5">
              <a
                href="#"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/30 transition-all active:scale-95"
                aria-label="Source code"
              >
                <Code2 className="w-5 h-5" />
              </a>
              <a
                href="#"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-300 hover:text-white hover:border-white/30 transition-all active:scale-95"
                aria-label="Social link"
              >
                <XIcon className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Link columns: Portals & Project on mobile (Product hidden as available in mobile drawer); all 3 across on desktop */}
          <div className="col-span-1 md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-6 xs:gap-8 sm:gap-10">
            {footerLinks.map((col) => {
              const isProduct = col.heading === "Product";

              return (
                <div
                  key={col.heading}
                  className={`${
                    isProduct ? "hidden md:flex" : "flex"
                  } flex-col items-center md:items-start text-center md:text-left col-span-1`}
                >
                  <p className="text-white text-xs sm:text-sm font-bold uppercase tracking-widest mb-3">
                    {col.heading}
                  </p>
                  <ul className="space-y-1 w-full flex flex-col items-center md:items-start">
                    {col.links.map((link) => (
                      <li key={link.label} className="w-full flex justify-center md:justify-start">
                        <a
                          href={link.href}
                          onClick={(e) => handleAnchorClick(e, link.href)}
                          className="text-slate-300 text-xs xs:text-sm sm:text-base hover:text-white transition-colors min-h-[40px] sm:min-h-[44px] flex items-center justify-center md:justify-start py-1"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left"
        >
          <p className="text-slate-500 text-xs text-center sm:text-left max-w-md sm:max-w-none">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved. Intelligent Transit & Terminal Operations across ASEAN.
          </p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Telemetry Active
            </span>
            <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full">
              ASEAN Transit Network
            </span>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}
