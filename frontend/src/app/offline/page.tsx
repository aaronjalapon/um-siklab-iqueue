import type { Metadata } from "next";
import Link from "next/link";
import { Home, Ticket, WifiOff } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { uiStyles } from "@/lib/design-system";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export const metadata: Metadata = {
  title: "Offline",
  description: `Offline fallback for ${BRAND.name}.`,
};

export default function OfflinePage() {
  return (
    <main className="relative min-h-screen bg-ui-canvas px-4 py-8 text-ui-foreground">
      <div className="absolute right-4 top-4 text-ui-foreground">
        <ThemeToggle />
      </div>
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-lg flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-ui-border bg-ui-surface text-ui-primary">
          <WifiOff className="h-9 w-9" aria-hidden />
        </div>

        <h1 className="font-heading text-3xl font-semibold tracking-tight text-ui-foreground">
          You are offline
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-ui-muted-foreground">
          Live search and booking need a connection. Saved boarding passes can
          still be opened from this device.
        </p>

        <div className="mt-7 grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
          <Link
            href="/tickets"
            className={`${uiStyles.primaryButton} inline-flex min-h-11 items-center justify-center gap-2 font-bold`}
          >
            <Ticket className="h-4 w-4" aria-hidden />
            Saved Tickets
          </Link>
          <Link
            href="/home"
            className={`${uiStyles.button} inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 font-bold`}
          >
            <Home className="h-4 w-4" aria-hidden />
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
