import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
import DevelopmentRuntimeGate from "@/components/DevelopmentRuntimeGate";
import PWARegistrar from "@/components/PWARegistrar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { themeBootstrapScript } from "@/lib/theme";
import { BRAND } from "@/lib/brand";
import { SHOULD_ENABLE_PWA } from "@/lib/pwa-runtime";
import "./globals.css";

const lexend = localFont({
  src: [
    { path: "./fonts/lexend-400.ttf", weight: "400" },
    { path: "./fonts/lexend-500.ttf", weight: "500" },
    { path: "./fonts/lexend-600.ttf", weight: "600" },
    { path: "./fonts/lexend-700.ttf", weight: "700" },
  ],
  variable: "--font-lexend",
  display: "swap",
});

const sourceSans = localFont({
  src: [
    { path: "./fonts/source-sans-400.ttf", weight: "400" },
    { path: "./fonts/source-sans-500.ttf", weight: "500" },
    { path: "./fonts/source-sans-600.ttf", weight: "600" },
    { path: "./fonts/source-sans-700.ttf", weight: "700" },
  ],
  variable: "--font-source-sans",
  display: "swap",
});

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
  themeColor: "#1A73E8",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light" className={`${lexend.variable} ${sourceSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body suppressHydrationWarning className="relative flex min-h-full flex-col overflow-x-hidden bg-ui-canvas font-sans text-ui-foreground">
        <ThemeProvider>
          <a href="#main-content" className="sr-only z-[100] rounded-lg bg-ui-surface px-4 py-3 text-ui-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
            Skip to main content
          </a>
          <div className="relative z-0 w-full flex-1">
            <DevelopmentRuntimeGate>{children}</DevelopmentRuntimeGate>
          </div>
          <PWARegistrar />
        </ThemeProvider>
      </body>
    </html>
  );
}
