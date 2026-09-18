"use client";

import Link from "next/link";

import { usePathname } from "next/navigation";
import { BarChart3, BrainCircuit, Bus, FileCheck2, Home, QrCode, Users } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BRAND } from "@/lib/brand";
import { uiStyles } from "@/lib/design-system";

const NAV_ITEMS = [
  { href: "/operator", label: "Dashboard", shortLabel: "Home", icon: BarChart3, exact: true },
  { href: "/operator/queue", label: "Queue", shortLabel: "Queue", icon: Users, exact: false },
  { href: "/operator/buses", label: "Buses", shortLabel: "Buses", icon: Bus, exact: false },
  { href: "/operator/scanner", label: "Boarding Scanner", shortLabel: "Scan", icon: QrCode, exact: false },
  { href: "/operator/evidence", label: "Evidence", shortLabel: "Evidence", icon: FileCheck2, exact: false },
  { href: "/operator/model", label: "Model Retraining", shortLabel: "Model", icon: BrainCircuit, exact: false },
  { href: "/", label: "Passenger View", shortLabel: "Passenger", icon: Home, exact: true },
];

function isNavActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href;
  if (href === "/operator") return pathname === "/operator";
  return pathname.startsWith(href);
}

export function OperatorShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="operator-clay min-h-dvh min-w-0 bg-ui-canvas md:flex">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-ui-border/70 bg-ui-surface px-4 text-ui-foreground dark:border-white/10 dark:bg-ui-navy dark:text-white md:hidden">
        <Link href="/operator" aria-label={`${BRAND.operatorName} — Operator Dashboard`}>
          <BrandLogo label={BRAND.operatorName} markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-ui-foreground dark:text-white" />
        </Link>
        <ThemeToggle className="text-ui-foreground dark:text-white" />
      </header>
      <aside className="fixed z-30 hidden h-full w-64 flex-col border-r border-ui-border bg-ui-surface text-ui-foreground dark:border-white/10 dark:bg-ui-navy dark:text-white md:flex">
        <div className="p-6">
          <Link
            href="/operator"
            className="inline-flex"
            aria-label={`${BRAND.operatorName} — Operator Dashboard`}
          >
            <BrandLogo
              label={BRAND.operatorName}
              textClassName="font-heading text-xl font-semibold text-ui-foreground dark:text-white"
            />
          </Link>
          <p className="ml-9 mt-1 text-xs text-ui-muted-foreground dark:text-slate-400">
            Operator Dashboard
          </p>
        </div>
        <nav
          className="flex-1 px-4 space-y-2 mt-2"
          aria-label="Operator navigation"
        >
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={active ? uiStyles.navItemActive : uiStyles.navItem}
              >
                <Icon className="w-5 h-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-ui-border dark:border-white/10 p-4">
          <ThemeToggle variant="menu" />
        </div>
      </aside>

      <main id="main-content" className="min-h-dvh min-w-0 flex-1 overflow-x-clip pb-28 pt-16 md:ml-64 md:pb-0 md:pt-0">
        {children}
      </main>

      <nav
        className="clay-nav fixed inset-x-0 bottom-0 z-40 flex w-full items-center justify-around border-t border-ui-border bg-ui-surface px-2 py-2 pb-safe md:hidden"
        aria-label="Operator navigation"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-w-0 ${
                active
                  ? "text-ui-primary"
                  : "text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              } transition-colors`}
            >
              <Icon className="w-5 h-5 shrink-0" aria-hidden />
              <span className="text-[10px] font-medium truncate max-w-full px-1">
                {item.shortLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
