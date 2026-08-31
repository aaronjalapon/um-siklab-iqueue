import type { Metadata, Viewport } from "next";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import DevelopmentRuntimeGate from "@/components/DevelopmentRuntimeGate";
import PWARegistrar from "@/components/PWARegistrar";
import { BRAND } from "@/lib/brand";
import { SHOULD_ENABLE_PWA } from "@/lib/pwa-runtime";
import "./globals.css";

config.autoAddCss = false;

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: SHOULD_ENABLE_PWA ? BRAND.name : undefined,
  appleWebApp: SHOULD_ENABLE_PWA
    ? {
        capable: true,
        title: BRAND.name,
        statusBarStyle: "default",
      }
    : undefined,
  formatDetection: {
    telephone: false,
  },
  icons: SHOULD_ENABLE_PWA
    ? {
        icon: [
          { url: "/tripsync-mark.png", sizes: "512x512", type: "image/png" },
          { url: "/icons/tripsync-icon-192.png", sizes: "192x192", type: "image/png" },
          { url: "/icons/tripsync-icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        shortcut: [{ url: "/tripsync-mark.png", sizes: "512x512", type: "image/png" }],
        apple: [
          {
            url: "/icons/tripsync-apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      }
    : undefined,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1A73E8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-foreground flex flex-col font-sans relative overflow-x-hidden">
        {/* Main Content */}
        <div className="flex-1 w-full relative z-0">
          <DevelopmentRuntimeGate>{children}</DevelopmentRuntimeGate>
        </div>
        <PWARegistrar />
      </body>
    </html>
  );
}
