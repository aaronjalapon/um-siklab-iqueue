import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IQueue — Smart Bus Boarding",
  description: "AI-powered smart boarding platform for inter-provincial bus terminals across ASEAN.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-gray-50 text-gray-900 flex flex-col">
        {/* Header */}
        <header className="bg-blue-700 text-white shadow-md">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold tracking-tight">🚌 IQueue</Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/" className="hover:underline">Search</Link>
              <Link href="/operator" className="hover:underline">Operator</Link>
            </nav>
          </div>
        </header>
        {/* Main */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">{children}</main>
        {/* Footer */}
        <footer className="bg-gray-100 text-center text-sm text-gray-500 py-4 border-t">
          UM Siklab — AI for Good Smart City Track 2026
        </footer>
      </body>
    </html>
  );
}
