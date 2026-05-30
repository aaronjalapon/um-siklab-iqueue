"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            🚌 IQueue
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link
              href="/"
              className={`hover:underline ${pathname === "/" ? "font-semibold" : ""}`}
            >
              Search
            </Link>
            <Link
              href="/operator"
              className={`hover:underline ${pathname === "/operator" ? "font-semibold" : ""}`}
            >
              Operator
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 text-center text-sm text-gray-500 py-4 border-t">
        UM Siklab — AI for Good Smart City Track 2026
      </footer>
    </div>
  );
}
