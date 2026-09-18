"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { uiStyles } from "@/lib/design-system";

const links = [
  { href: "#features", label: "Platform" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#network", label: "Network" },
];

export default function LandingNavbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/15 bg-ui-navy text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="#hero" aria-label="TripSync home" onClick={() => setOpen(false)}>
          <BrandLogo markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-white" />
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary navigation">
          {links.map((link) => <Link key={link.href} href={link.href} className="text-sm font-semibold text-slate-200 transition-colors hover:text-white">{link.label}</Link>)}
          <Link href="/operator" className="text-sm font-semibold text-slate-200 transition-colors hover:text-white">Operator demo</Link>
          <ThemeToggle className="text-white" />
          <Link href="/buy" className={`${uiStyles.primaryButton} min-h-10 px-4 py-1.5`}>Find a bus</Link>
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle className="text-white" />
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/20" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-white/15 px-4 py-4 md:hidden" aria-label="Mobile navigation">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-2.5 font-semibold text-slate-100 hover:bg-white/10">{link.label}</Link>)}
            <Link href="/operator" onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-2.5 font-semibold text-slate-100 hover:bg-white/10">Operator demo</Link>
            <Link href="/buy" onClick={() => setOpen(false)} className={`${uiStyles.primaryButton} mt-2`}>Find a bus</Link>
          </div>
        </nav>
      )}
    </header>
  );
}
