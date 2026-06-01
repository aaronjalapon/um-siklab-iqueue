import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import "./globals.css";

config.autoAddCss = false;

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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground flex flex-col font-sans relative overflow-x-hidden">
        {/* Decorative background blobs for glassmorphism pop */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-blue/20 dark:bg-brand-blue/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-brand-orange/20 dark:bg-brand-orange/10 rounded-full blur-3xl pointer-events-none -z-10" />
        
        {/* Main Content */}
        <div className="flex-1 w-full relative z-0">
          {children}
        </div>
      </body>
    </html>
  );
}
