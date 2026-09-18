"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const links = [
  { href: "#features", label: "Platform" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#network", label: "Network" },
];

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#07111f]/90 text-white shadow-[0_12px_45px_-28px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="#hero" aria-label="TripSync home" onClick={() => setOpen(false)} className="rounded-lg">
          <BrandLogo markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-white" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              {link.label}
            </Link>
          ))}
          <Link href="/operator" className="flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white">Operator demo</Link>
          <ThemeToggle className="ml-1 text-white" />
          <Link href="/buy" className="clay-action ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500">
            Find a bus <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </nav>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle className="text-white" />
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20 transition-colors hover:bg-white/10"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="landing-mobile-menu" className="border-t border-white/10 bg-[#07111f] px-4 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 py-2.5 font-semibold text-slate-100 hover:bg-white/10">{link.label}</Link>
            ))}
            <Link href="/operator" onClick={() => setOpen(false)} className="flex min-h-11 items-center rounded-lg px-3 py-2.5 font-semibold text-slate-100 hover:bg-white/10">Operator demo</Link>
            <Link href="/buy" onClick={() => setOpen(false)} className="clay-action mt-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white hover:bg-blue-500">
              Find a bus <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
