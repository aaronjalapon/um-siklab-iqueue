"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BusFront, Home, Ticket, ShoppingCart, Tag, User } from "lucide-react";
import ChatbotPanel from "@/components/ChatbotPanel";

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/home", label: "Home", icon: Home, match: ["/home"] },
    { href: "/tickets", label: "My Ticket", icon: Ticket, match: ["/tickets", "/confirmation"] },
    { href: "/buy", label: "Buy", icon: ShoppingCart, centerMobile: true, match: ["/buy", "/book"] },
    { href: "/promo", label: "Promo", icon: Tag, match: ["/promo"] },
    { href: "/account", label: "Account", icon: User, match: ["/account"] },
  ];

  const isItemActive = (item: (typeof navItems)[number]) =>
    item.match.some((match) => pathname === match || pathname.startsWith(`${match}/`));

  return (
    <div className="min-h-screen min-w-0 bg-slate-50 dark:bg-slate-950 md:flex">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full z-30 shadow-sm">
        <div className="p-6">
          <Link href="/home" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BusFront className="h-7 w-7 text-brand-blue" aria-hidden />
            IQueue
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-semibold ${
                  isActive 
                    ? "bg-brand-blue text-white shadow-md shadow-brand-blue/20" 
                    : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1 overflow-x-clip pb-24 md:ml-64 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-2 flex justify-around items-end pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-40 rounded-t-3xl">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;

          if (item.centerMobile) {
            return (
              <div key={item.href} className="relative -top-5 flex flex-1 justify-center">
                <Link
                  href={item.href}
                  className="w-14 h-14 bg-brand-blue rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-blue/30 active:scale-95 transition-transform"
                  aria-label={item.label}
                >
                  <Icon className="w-6 h-6" />
                </Link>
                <span className="absolute -bottom-5 w-full text-center text-[10px] font-medium text-slate-400">
                  {item.label}
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1 ${
                isActive ? "text-brand-blue" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              } transition-colors`}
            >
              <Icon className="w-5 h-5" />
              <span className="max-w-full truncate text-[10px] font-medium">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Floating chatbot — available on all passenger pages */}
      <ChatbotPanel />
    </div>
  );
}
