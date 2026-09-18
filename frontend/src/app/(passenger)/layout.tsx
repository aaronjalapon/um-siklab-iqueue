"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BusFront, Home, LogOut, MessageCircle, Tag, Ticket, User, WifiOff } from "lucide-react";
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
  const isBookingFunnel = pathname === "/buy" || pathname.startsWith("/book/");
  const [showCancelModal, setShowCancelModal] = useState(false);
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

  const navItems = [
    { href: "/home", label: "Home", icon: Home, match: ["/home"] },
    { href: "/tickets", label: "My Ticket", icon: Ticket, match: ["/tickets", "/confirmation"] },
    { href: "/buy", label: "Buy", icon: BusFront, centerMobile: true, match: ["/buy", "/book"] },
    { href: "/promo", label: "Promo", icon: Tag, match: ["/promo"] },
    { href: "/account", label: "Account", icon: User, match: ["/account"] },
  ];

  const isItemActive = (item: (typeof navItems)[number]) =>
    item.match.some((match) => pathname === match || pathname.startsWith(`${match}/`));

  return (
    <div className="min-h-dvh min-w-0 bg-ui-canvas md:flex">
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-ui-navy px-4 text-white md:hidden">
        <Link href="/home" onClick={handleLogoClick} aria-label={`${BRAND.name} passenger home`}>
          <BrandLogo markClassName="h-9 w-9" textClassName="font-heading text-lg font-semibold text-white" />
        </Link>
        <ThemeToggle className="text-white" />
      </header>
      {/* Desktop Sidebar (hidden on mobile) */}
      <aside className="fixed z-30 hidden h-full w-64 flex-col border-r border-white/10 bg-ui-navy text-white md:flex">
        <div className="p-6">
          <Link
            href="/home"
            prefetch={false}
            onClick={handleLogoClick}
            className="inline-flex"
            aria-label={`${BRAND.name} passenger home`}
          >
            <BrandLogo textClassName="font-heading text-xl font-semibold text-white" />
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
                className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-colors font-semibold ${
                  isActive 
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer / Log Out Action */}
        <div className="border-t border-white/10 p-4">
          <ThemeToggle variant="menu" className="mb-1" />
          <button
            type="button"
            onClick={handleLogoutClick}
            className="group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 font-semibold text-slate-300 transition-colors duration-150 hover:bg-white/10 hover:text-white"
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
        {isBookingFunnel && (
          <div className="mx-auto flex max-w-7xl justify-end px-4 pt-3 sm:px-6 lg:px-8">
            <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-ui-border bg-ui-surface px-3 py-2 text-sm font-semibold text-ui-foreground transition-colors hover:border-ui-primary hover:text-ui-primary" onClick={() => window.dispatchEvent(new Event("tripsync:open-assistant"))}>
              <MessageCircle className="h-4 w-4" aria-hidden /> Need help?
            </button>
          </div>
        )}
        {children}
      </main>

      {/* Mobile Bottom Navigation (hidden on desktop) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex w-full items-end justify-around border-t border-ui-border bg-ui-surface px-2 pb-2 pt-1 pb-safe md:hidden" aria-label="Passenger navigation">
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
                      : "font-medium text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
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
      <ChatbotPanel hideLauncher={isBookingFunnel} />
    </div>
  );
}
