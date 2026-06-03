"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Ticket, ShoppingCart, Tag, User } from "lucide-react";
import ChatbotPanel from "@/components/ChatbotPanel";

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/tickets", label: "My Ticket", icon: Ticket },
    { href: "/buy", label: "Buy", icon: ShoppingCart, centerMobile: true },
    { href: "/promo", label: "Promo", icon: Tag },
    { href: "/account", label: "Account", icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 md:flex">
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 fixed h-full z-30 shadow-sm">
        <div className="p-6">
          <Link href="/home" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            🚌 IQueue
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href === '/buy' && pathname.startsWith('/buy')) || (item.href === '/home' && pathname === '/home');
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
      <main className="flex-1 md:ml-64 pb-20 md:pb-0 overflow-x-hidden">
        <div className="max-w-5xl mx-auto w-full">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="md:hidden fixed bottom-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-6 py-2 flex justify-between items-center pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.2)] z-40 rounded-t-3xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/buy' && pathname.startsWith('/buy')) || (item.href === '/home' && pathname === '/home');
          const Icon = item.icon;

          if (item.centerMobile) {
            return (
              <div key={item.href} className="relative -top-6">
                <Link
                  href={item.href}
                  className="w-14 h-14 bg-brand-blue rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-blue/30 active:scale-95 transition-transform"
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
              className={`flex flex-col items-center justify-center gap-1 w-12 pt-2 pb-1 ${
                isActive ? "text-brand-blue" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              } transition-colors`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Floating chatbot — available on all passenger pages */}
      <ChatbotPanel />
    </div>
  );
}
