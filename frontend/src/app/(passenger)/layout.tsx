"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BusFront, History, Home, LogOut, Menu, Ticket, User, WifiOff, X } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ChatbotPanel from "@/components/ChatbotPanel";
import { CancelTransactionModal } from "@/components/ui/CancelTransactionModal";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BRAND } from "@/lib/brand";

export default function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);

  // Detect mid-process booking flow: preferences or seat allocation
  const isBookingInProgress = /^\/book\/[^/]+\/(preferences|seat-selection)/.test(pathname);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<{
    label: string;
    action: () => void;
  } | null>(null);

  const handleLogout = () => {
    router.replace("/#hero");
  };

  const handleNavClick = (e: React.MouseEvent, item: { href: string; label: string }) => {
    if (isBookingInProgress) {
      e.preventDefault();
      setPendingTarget({
        label: item.label,
        action: () => router.push(item.href),
      });
      setShowCancelModal(true);
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (isBookingInProgress) {
      e.preventDefault();
      setPendingTarget({
        label: "Home",
        action: () => router.push("/home"),
      });
      setShowCancelModal(true);
    }
  };

  const handleLogoutClick = (e: React.MouseEvent) => {
    if (isBookingInProgress) {
      e.preventDefault();
      setPendingTarget({
        label: "Landing Page (Log Out)",
        action: handleLogout,
      });
      setShowCancelModal(true);
    } else {
      handleLogout();
    }
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    if (pendingTarget) {
      pendingTarget.action();
    }
    setPendingTarget(null);
  };

  const handleDismissCancel = () => {
    setShowCancelModal(false);
    setPendingTarget(null);
  };

  // Browser-level reload / tab-close protection while in active transaction
  useEffect(() => {
    if (!isBookingInProgress) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isBookingInProgress]);

  useEffect(() => {
    function updateOnlineState() {
      setIsOnline(navigator.onLine);
    }

    updateOnlineState();
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);

    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [mobileMenuOpen]);

  // Close mobile menu on Escape
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const navItems = [
    { href: "/home", label: "Home", icon: Home, match: ["/home", "/notifications"] },
    { href: "/tickets", label: "My Ticket", icon: Ticket, match: ["/tickets", "/confirmation"] },
    { href: "/buy", label: "Book", icon: BusFront, centerMobile: true, match: ["/buy", "/book"] },
    { href: "/history", label: "History", icon: History, match: ["/history"] },
    { href: "/account", label: "Account", icon: User, match: ["/account", "/promo"] },
  ];

  const isItemActive = (item: (typeof navItems)[number]) =>
    item.match.some((match) => pathname === match || pathname.startsWith(`${match}/`));

  return (
    <div className="passenger-clay min-h-dvh min-w-0 bg-ui-canvas md:flex">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-ui-border/70 bg-ui-surface px-4 text-ui-foreground dark:border-white/10 dark:bg-ui-navy dark:text-white md:hidden">
        <Link href="/home" onClick={handleLogoClick} aria-label={`${BRAND.name} passenger home`}>
          <BrandLogo markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-ui-foreground dark:text-white" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle className="text-ui-foreground dark:text-white" />
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-ui-border dark:border-white/20 text-ui-foreground dark:text-white hover:bg-ui-muted dark:hover:bg-white/10"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            aria-controls="passenger-mobile-menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Full-Screen Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="passenger-mobile-menu"
          className="fixed inset-0 z-[60] flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-ui-surface dark:bg-[#07111f] text-ui-foreground dark:text-white touch-none select-none overscroll-none md:hidden"
          aria-label="Mobile navigation"
        >
          {/* Top Bar matching mobile header */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border/70 dark:border-white/10 px-4">
            <Link
              href="/home"
              onClick={(e) => {
                setMobileMenuOpen(false);
                handleLogoClick(e);
              }}
              aria-label={`${BRAND.name} passenger home`}
            >
              <BrandLogo markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-ui-foreground dark:text-white" />
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle className="text-ui-foreground dark:text-white" />
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-ui-border dark:border-white/20 text-ui-foreground dark:text-white hover:bg-ui-muted dark:hover:bg-white/10"
                aria-label="Close navigation"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex flex-1 flex-col justify-between px-4 py-5 overflow-y-auto">
            <nav className="flex flex-col gap-2" aria-label="Mobile navigation links">
              {navItems.map((item, idx) => {
                const isActive = isItemActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      setMobileMenuOpen(false);
                      handleNavClick(e, item);
                    }}
                    className={`group flex items-center justify-between rounded-xl border px-4 py-3 font-heading text-base font-bold tracking-tight transition-all active:scale-[0.98] ${
                      isActive
                        ? "border-ui-primary/60 bg-ui-primary/10 text-ui-primary dark:border-blue-400/40 dark:bg-blue-500/20 dark:text-blue-300"
                        : "border-ui-border/60 dark:border-white/10 bg-ui-surface/60 dark:bg-white/[0.03] text-ui-foreground dark:text-white hover:border-ui-primary/50 hover:bg-ui-primary/5 dark:hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-ui-primary/10 dark:bg-blue-500/20 font-mono text-[0.7rem] font-bold text-ui-primary dark:text-blue-400">
                        0{idx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ui-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-ui-primary dark:text-slate-400" aria-hidden />
                  </Link>
                );
              })}
            </nav>

            {/* Bottom Actions: Log Out */}
            <div className="mt-4 border-t border-ui-border/70 dark:border-white/10 pt-4">
              <button
                type="button"
                onClick={(e) => {
                  setMobileMenuOpen(false);
                  handleLogoutClick(e);
                }}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="fixed z-30 hidden h-full w-64 flex-col border-r border-ui-border bg-ui-surface text-ui-foreground dark:border-white/10 dark:bg-ui-navy dark:text-white md:flex">
        <div className="p-6">
          <Link
            href="/home"
            prefetch={false}
            onClick={handleLogoClick}
            className="inline-flex"
            aria-label={`${BRAND.name} passenger home`}
          >
            <BrandLogo textClassName="font-heading text-xl font-semibold text-ui-foreground dark:text-white" />
          </Link>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = isItemActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(e) => handleNavClick(e, item)}
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-150 font-semibold text-sm ${
                  isActive 
                    ? "bg-ui-primary text-white shadow-sm shadow-ui-primary/25 dark:bg-white dark:text-slate-950 dark:shadow-none"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Log Out Action */}
        <div className="border-t border-ui-border p-4 dark:border-white/10">
          <ThemeToggle variant="menu" className="mb-1" />
          <button
            type="button"
            onClick={handleLogoutClick}
            className="group flex min-h-11 w-full items-center gap-3 rounded-xl px-4 py-2.5 font-semibold text-slate-600 transition-colors duration-150 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-primary"
            title="Log out and return to landing page"
            aria-label="Log Out"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main id="main-content" className="min-w-0 flex-1 overflow-x-clip pb-28 pt-16 md:ml-64 md:pb-0 md:pt-0">
        {!isOnline && (
          <div className="sticky top-0 z-20 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/80 dark:text-amber-100">
            <span className="mx-auto flex max-w-7xl items-center gap-2">
              <WifiOff className="h-4 w-4" aria-hidden />
              Offline mode
            </span>
          </div>
        )}
        {children}
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="clay-nav fixed inset-x-0 bottom-0 z-40 flex w-full items-end justify-around border-t border-ui-border bg-ui-surface px-2 pb-2 pt-1 pb-safe md:hidden" aria-label="Passenger navigation">
        {navItems.map((item) => {
          const isActive = isItemActive(item);
          const Icon = item.icon;

          if (item.centerMobile) {
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                onClick={(e) => handleNavClick(e, item)}
                className="group relative flex min-w-0 flex-1 flex-col items-center justify-end px-1 pb-1 transition-colors"
                aria-label={item.label}
              >
                <div
                  className={`-mt-7 mb-1.5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-blue text-white shadow-lg active:scale-95 transition-all ${
                    isActive
                      ? "ring-4 ring-brand-blue/30 shadow-brand-blue/50"
                      : "shadow-brand-blue/35 group-hover:bg-blue-600"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span
                  className={`max-w-full truncate text-[10px] leading-none transition-colors ${
                    isActive
                      ? "font-bold text-ui-primary dark:text-blue-400"
                      : "font-medium text-slate-600 group-hover:text-slate-800 dark:text-slate-300 dark:group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              onClick={(e) => handleNavClick(e, item)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-end gap-1.5 px-1 pb-1 transition-colors ${
                isActive
                  ? "text-ui-primary dark:text-blue-400"
                  : "text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white"
              }`}
            >
              <div className="flex h-7 items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={`max-w-full truncate text-[10px] leading-none ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Warning popup for navigating away mid-booking transaction */}
      <CancelTransactionModal
        isOpen={showCancelModal}
        onConfirm={handleConfirmCancel}
        onCancel={handleDismissCancel}
        targetLabel={pendingTarget?.label}
      />

      {/* Floating chatbot — available on all passenger pages */}
      <ChatbotPanel />
    </div>
  );
}
