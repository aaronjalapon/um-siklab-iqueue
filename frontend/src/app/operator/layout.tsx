"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bus, Home, Users } from "lucide-react";

const NAV_ITEMS = [
  { href: "/operator", label: "Dashboard", icon: BarChart3 },
  { href: "/operator/queue", label: "Queue", icon: Users },
  { href: "/operator/buses", label: "Buses", icon: Bus },
  { href: "/", label: "Passenger View", icon: Home },
];

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex-shrink-0 hidden md:block">
        <div className="p-6">
          <Link href="/operator" className="text-xl font-bold tracking-tight">
            🚌 IQueue Ops
          </Link>
          <p className="text-xs text-gray-400 mt-1">Operator Dashboard</p>
        </div>
        <nav className="px-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  active
                    ? "bg-blue-700 text-white"
                    : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 min-h-screen p-6 pb-20 md:pb-6">{children}</main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around pb-safe z-40">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 py-3 px-2 flex-1 text-center transition ${
                active ? "text-blue-700" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
