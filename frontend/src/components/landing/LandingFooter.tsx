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
    <footer className="bg-slate-950 border-t border-white/10 pt-16 pb-8 relative">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-14">
          {/* Brand col */}
          <div className="col-span-1 md:col-span-1">
            <Link
              href="/#hero"
              onClick={handleLogoClick}
              className="mb-4 inline-flex group"
              aria-label={`${BRAND.name} home`}
            >
              <BrandLogo
                showTagline
                className="transition-transform group-hover:scale-105"
                textClassName="text-xl font-bold text-white tracking-tight"
                taglineClassName="text-[0.65rem] font-semibold tracking-wide text-slate-400"
              />
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed max-w-xs">
              AI-powered smart boarding for inter-provincial bus terminals across ASEAN.
            </p>
            <div className="flex gap-3 mt-5">
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

          {/* Link columns */}
          {footerLinks.map((col) => (
            <div key={col.heading}>
              <p className="text-white text-xs sm:text-sm font-bold uppercase tracking-widest mb-3">{col.heading}</p>
              <ul className="space-y-1">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      onClick={(e) => handleAnchorClick(e, link.href)}
                      className="text-slate-300 text-sm sm:text-base hover:text-white transition-colors min-h-[44px] flex items-center py-1"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4"
        >
          <p className="text-slate-500 text-xs text-center sm:text-left">
            © {new Date().getFullYear()} {BRAND.name}. All rights reserved. Intelligent Transit & Terminal Operations across ASEAN.
          </p>
          <div className="flex items-center gap-3">
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
