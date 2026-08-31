import type { Metadata } from "next";
import Link from "next/link";
import { Home, Ticket, WifiOff } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { glassStyles } from "@/lib/design-system";

export const metadata: Metadata = {
  title: "Offline",
  description: `Offline fallback for ${BRAND.name}.`,
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-foreground dark:bg-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-blue-100 bg-blue-50 text-brand-blue shadow-inner dark:border-blue-900/40 dark:bg-blue-950/30">
          <WifiOff className="h-9 w-9" aria-hidden />
        </div>

        <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">
          You are offline
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          Live search and booking need a connection. Saved boarding passes can
          still be opened from this device.
        </p>

        <div className="mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/tickets"
            className={`${glassStyles.primaryButton} inline-flex min-h-11 items-center justify-center gap-2 font-bold`}
          >
            <Ticket className="h-4 w-4" aria-hidden />
            Saved Tickets
          </Link>
          <Link
            href="/home"
            className={`${glassStyles.button} inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 font-bold`}
          >
            <Home className="h-4 w-4" aria-hidden />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
