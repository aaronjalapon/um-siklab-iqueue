"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bus, Home, Users, BusFront } from "lucide-react";
import { glassStyles } from "@/lib/design-system";

const NAV_ITEMS = [
  { href: "/operator", label: "Dashboard", shortLabel: "Home", icon: BarChart3, exact: true },
  { href: "/operator/queue", label: "Queue", shortLabel: "Queue", icon: Users, exact: false },
  { href: "/operator/buses", label: "Buses", shortLabel: "Buses", icon: Bus, exact: false },
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full z-30 shadow-sm">
        <div className="p-6">
          <Link
            href="/operator"
            className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"
            aria-label="IQueue Ops — Operator Dashboard"
          >
            <BusFront className="w-7 h-7 text-brand-blue" aria-hidden />
            <span>IQueue Ops</span>
          </Link>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-9">
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
                className={active ? glassStyles.navItemActive : glassStyles.navItem}
              >
                <Icon className="w-5 h-5" aria-hidden />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-x-hidden min-h-screen">
        {children}
      </main>

      <nav
        className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around items-center pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-40 rounded-t-3xl"
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
                  ? "text-brand-blue"
                  : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
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
