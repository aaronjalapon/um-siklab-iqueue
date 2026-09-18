"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { smoothScrollTo } from "@/components/SmoothScroll";

const links = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#network", label: "Network" },
];

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);

  // Lock body and Lenis scroll when full-screen mobile menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      window.__lenis?.stop();
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
      window.__lenis?.start();
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
      window.__lenis?.start();
    };
  }, [open]);

  // Handle escape key to close menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setOpen(false);
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.touchAction = "";
    window.__lenis?.start();
    setTimeout(() => {
      smoothScrollTo(href, 0);
    }, 60);
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-ui-border/70 dark:border-white/10 bg-ui-surface/85 dark:bg-[#07111f]/90 text-ui-foreground dark:text-white shadow-sm dark:shadow-[0_12px_45px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <a
            href="#hero"
            aria-label="TripSync home"
            onClick={(e) => handleNavClick(e, "#hero")}
            className="rounded-lg cursor-pointer"
          >
            <BrandLogo markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-ui-foreground dark:text-white" />
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-ui-muted-foreground hover:bg-ui-muted hover:text-ui-foreground dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <ThemeToggle className="ml-1 text-ui-foreground dark:text-white" />
            <Link href="/buy" className="clay-action ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">
              Find a bus <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <ThemeToggle className="text-ui-foreground dark:text-white" />
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-ui-border dark:border-white/20 text-ui-foreground dark:text-white hover:bg-ui-muted dark:hover:bg-white/10"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="landing-mobile-menu"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Full-Screen Mobile Drawer — Non-scrollable with comfortably raised actions */}
      {open && (
        <div
          id="landing-mobile-menu"
          onTouchMove={(e) => e.preventDefault()}
          className="fixed inset-0 z-[60] flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-ui-surface dark:bg-[#07111f] text-ui-foreground dark:text-white touch-none select-none overscroll-none md:hidden"
          aria-label="Mobile navigation"
        >
          {/* Top Bar matching main header */}
          <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-ui-border/70 dark:border-white/10 px-4 sm:px-6">
            <a
              href="#hero"
              aria-label="TripSync home"
              onClick={(e) => handleNavClick(e, "#hero")}
              className="rounded-lg cursor-pointer"
            >
              <BrandLogo markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-ui-foreground dark:text-white" />
            </a>

            <div className="flex items-center gap-2">
              <ThemeToggle className="text-ui-foreground dark:text-white" />
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-ui-border dark:border-white/20 text-ui-foreground dark:text-white hover:bg-ui-muted dark:hover:bg-white/10"
                aria-label="Close navigation"
                onClick={() => setOpen(false)}
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Body: Compact, non-scrollable, vertically centered with Find a bus button raised */}
          <div className="flex flex-1 flex-col justify-center px-4 py-4 sm:px-6 overflow-hidden">
            <div className="w-full flex flex-col gap-3">
              <nav className="flex flex-col gap-2" aria-label="Mobile navigation links">
                {links.map((link, idx) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    className="group flex items-center justify-between rounded-xl border border-ui-border/60 dark:border-white/10 bg-ui-surface/60 dark:bg-white/[0.03] px-4 py-3 font-heading text-lg font-bold tracking-tight text-ui-foreground dark:text-white hover:border-ui-primary/50 hover:bg-ui-primary/5 dark:hover:bg-white/10 active:scale-[0.98] cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ui-primary/10 dark:bg-blue-500/20 font-mono text-[0.7rem] font-bold text-ui-primary dark:text-blue-400">
                        0{idx + 1}
                      </span>
                      <span className="text-base sm:text-lg">{link.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ui-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-ui-primary dark:text-slate-400" aria-hidden />
                  </a>
                ))}
              </nav>

              {/* Find a bus button — Raised comfortably right under navigation items */}
              <div className="pt-1">
                <Link
                  href="/buy"
                  onClick={() => {
                    setOpen(false);
                    document.body.style.overflow = "";
                    document.documentElement.style.overflow = "";
                    document.body.style.touchAction = "";
                    window.__lenis?.start();
                  }}
                  className="clay-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm sm:text-base font-bold text-white shadow-md hover:bg-blue-500 active:scale-[0.98]"
                >
                  Find a bus <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
