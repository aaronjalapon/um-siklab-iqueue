"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  BusFront,
  CheckCheck,
  Info,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { uiStyles } from "@/lib/design-system";

interface NotificationItem {
  id: string;
  category: "trips" | "system";
  badge: string;
  badgeColor: string;
  icon: "bus" | "sparkles" | "info";
  title: string;
  description: string;
  timestamp: string;
  unread: boolean;
  meta: string[];
  actionLabel?: string;
  actionHref?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    category: "trips",
    badge: "Live Boarding",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/40",
    icon: "bus",
    title: "Boarding window starting soon · Bay 3",
    description: "Bus TR-402 (Tagbilaran to Jagna) has arrived at Bay 3. Please have your QR boarding pass ready on your screen for fast scanning.",
    timestamp: "5 mins ago",
    unread: true,
    meta: ["Tagbilaran → Jagna", "Seat 1A", "Gate Ready"],
    actionLabel: "View E-Ticket",
    actionHref: "/tickets",
  },
  {
    id: "notif-2",
    category: "trips",
    badge: "Smart Allocation",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/40",
    icon: "sparkles",
    title: "Seat affinity match confirmed",
    description: "Your accessibility priority seat and front-row travel preference were verified. Your reserved seat 1A is guaranteed.",
    timestamp: "2 hours ago",
    unread: false,
    meta: ["Priority Seat", "Affinity Match 98%"],
    actionLabel: "Trip Details",
    actionHref: "/history",
  },
  {
    id: "notif-3",
    category: "system",
    badge: "Service Advisory",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/40",
    icon: "info",
    title: "Express departures operating on time",
    description: "All provincial bus departures between Tagbilaran Central, Tubigon, and Jagna are running on scheduled headway with zero delays.",
    timestamp: "Yesterday",
    unread: false,
    meta: ["Bohol Corridor", "Normal Service"],
  },
];

type FilterTab = "all" | "trips" | "system" | "archived";

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [archivedItems, setArchivedItems] = useState<NotificationItem[]>([]);

  // Derived counts
  const unreadCount = items.filter((n) => n.unread).length;
  const tripsCount = items.filter((n) => n.category === "trips").length;
  const systemCount = items.filter((n) => n.category === "system").length;
  const archivedCount = archivedItems.length;

  const handleMarkAllRead = () => {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  };

  const handleDismiss = (id: string) => {
    const itemToArchive = items.find((item) => item.id === id);
    if (itemToArchive) {
      setArchivedItems((prev) => [{ ...itemToArchive, unread: false }, ...prev]);
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleClearAll = () => {
    setArchivedItems((prev) => [...items.map((i) => ({ ...i, unread: false })), ...prev]);
    setItems([]);
  };

  const handleResetDemo = () => {
    setItems(INITIAL_NOTIFICATIONS);
    setArchivedItems([]);
    setActiveTab("all");
  };

  // Filter items based on activeTab
  const visibleItems =
    activeTab === "archived"
      ? archivedItems
      : activeTab === "all"
      ? items
      : items.filter((item) => item.category === activeTab);

  return (
    <div className={`${uiStyles.pageContainer} max-w-4xl !space-y-4 sm:!space-y-6 !px-3 sm:!px-6 !py-3 sm:!py-6`}>
      {/* Top Back Link */}
      <div>
        <Link
          href="/home"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ui-primary hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Page Header */}
      <PageHeader
        eyebrow="Inbox & Alerts"
        title="Notifications"
        description="Real-time gate announcements, departure alerts, and booking status updates."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-semibold text-ui-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Mark all notifications as read"
              >
                <CheckCheck className="h-3.5 w-3.5 text-ui-primary" aria-hidden />
                <span>Mark all read</span>
              </button>
            )}

            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex min-h-9 sm:min-h-10 items-center justify-center gap-1.5 rounded-xl border border-ui-border bg-ui-surface px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900/40 dark:hover:text-red-400 transition-colors cursor-pointer"
                title="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                <span className="hidden sm:inline">Clear all</span>
              </button>
            )}
          </div>
        }
      />

      {/* Status Bar: Live status indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/70 p-3.5 sm:p-4 text-xs dark:border-blue-900/40 dark:bg-blue-950/25">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ui-primary text-white shadow-xs">
            <Radio className="h-4 w-4 animate-pulse" aria-hidden />
          </div>
          <div>
            <p className="font-bold text-slate-900 dark:text-white">
              Push alerts active on this device
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              You will receive automated platform calls 15 minutes prior to departure.
            </p>
          </div>
        </div>

        {unreadCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200/80 dark:border-red-900/50 px-2.5 py-1 text-[11px] font-bold text-red-700 dark:text-red-300">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            <span>{unreadCount} unread {unreadCount === 1 ? "alert" : "alerts"}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-900/50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            <span>Up to date</span>
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-ui-primary text-white shadow-sm shadow-ui-primary/25"
              : "border border-ui-border bg-ui-surface text-ui-muted-foreground hover:text-ui-foreground"
          }`}
        >
          <span>All</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "all" ? "bg-white/20 text-white" : "bg-ui-muted text-ui-muted-foreground"}`}>
            {items.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("trips")}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "trips"
              ? "bg-ui-primary text-white shadow-sm shadow-ui-primary/25"
              : "border border-ui-border bg-ui-surface text-ui-muted-foreground hover:text-ui-foreground"
          }`}
        >
          <span>Trips & Boarding</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "trips" ? "bg-white/20 text-white" : "bg-ui-muted text-ui-muted-foreground"}`}>
            {tripsCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("system")}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "system"
              ? "bg-ui-primary text-white shadow-sm shadow-ui-primary/25"
              : "border border-ui-border bg-ui-surface text-ui-muted-foreground hover:text-ui-foreground"
          }`}
        >
          <span>Advisories</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "system" ? "bg-white/20 text-white" : "bg-ui-muted text-ui-muted-foreground"}`}>
            {systemCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
            activeTab === "archived"
              ? "bg-ui-primary text-white shadow-sm shadow-ui-primary/25"
              : "border border-ui-border bg-ui-surface text-ui-muted-foreground hover:text-ui-foreground"
          }`}
        >
          <span>Archived</span>
          <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${activeTab === "archived" ? "bg-white/20 text-white" : "bg-ui-muted text-ui-muted-foreground"}`}>
            {archivedCount}
          </span>
        </button>
      </div>

      {/* Notifications List or Empty State Placeholder */}
      <div className="space-y-3">
        {visibleItems.length > 0 ? (
          visibleItems.map((item) => {
            const isUnread = item.unread;
            return (
              <div
                key={item.id}
                className={`relative rounded-2xl sm:rounded-3xl border p-4 sm:p-5 transition-all duration-200 ${
                  isUnread
                    ? "border-ui-primary/40 bg-ui-surface shadow-md shadow-ui-primary/5 dark:border-blue-500/30"
                    : "border-ui-border bg-ui-surface hover:border-slate-300 dark:hover:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* Category Icon */}
                  <div
                    className={`flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-2xl border ${
                      item.icon === "bus"
                        ? "bg-blue-500/10 text-brand-blue border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400"
                        : item.icon === "sparkles"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400"
                    }`}
                  >
                    {item.icon === "bus" && <BusFront className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />}
                    {item.icon === "sparkles" && <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />}
                    {item.icon === "info" && <Info className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />}
                  </div>

                  {/* Body */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${item.badgeColor}`}
                        >
                          {item.badge}
                        </span>
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-ui-primary dark:text-blue-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-ui-primary dark:bg-blue-400 animate-pulse" />
                            New
                          </span>
                        )}
                      </div>

                      <span className="text-[11px] font-medium text-ui-muted-foreground">
                        {item.timestamp}
                      </span>
                    </div>

                    <h3 className="mt-1.5 text-sm sm:text-base font-bold text-ui-foreground leading-snug">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-xs sm:text-sm text-ui-muted-foreground leading-relaxed">
                      {item.description}
                    </p>

                    {/* Metadata tags */}
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      {item.meta.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg border border-ui-border/70 bg-ui-surface-soft px-2 py-0.5 text-[10px] sm:text-[11px] font-medium text-slate-600 dark:text-slate-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Optional Action CTA */}
                    {item.actionLabel && item.actionHref && (
                      <div className="mt-3.5">
                        <Link
                          href={item.actionHref}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-ui-primary px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-600 transition-colors shadow-xs"
                        >
                          <span>{item.actionLabel}</span>
                          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Top-Right Dismiss Button */}
                  {activeTab !== "archived" && (
                    <button
                      type="button"
                      onClick={() => handleDismiss(item.id)}
                      className="shrink-0 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                      title="Dismiss notification"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          /* Empty Placeholder State */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-ui-border bg-ui-surface/60 p-8 sm:p-12 text-center">
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-3xl border border-amber-200/80 bg-amber-50/90 shadow-inner dark:border-amber-900/40 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
              {activeTab === "archived" ? (
                <Bell className="h-8 w-8 sm:h-10 sm:w-10 opacity-70" aria-hidden />
              ) : (
                <BellOff className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden />
              )}
            </div>

            <h2 className="mt-4 text-base sm:text-xl font-bold text-ui-foreground">
              {activeTab === "archived"
                ? "No archived notifications"
                : "You're all caught up!"}
            </h2>

            <p className="mt-1.5 max-w-sm text-xs sm:text-sm leading-relaxed text-ui-muted-foreground">
              {activeTab === "archived"
                ? "Dismissed alerts and past gate announcements will be recorded here."
                : "There are no active notifications at the moment. Real-time boarding calls, platform assignments, and AI seat alerts will appear here."}
            </p>

            {/* Quick CTAs */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
              <Link
                href="/buy"
                className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-2 rounded-xl bg-ui-primary px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-blue-600 transition-all shadow-sm shadow-ui-primary/20"
              >
                <Search className="h-4 w-4" aria-hidden />
                <span>Search Bus Routes</span>
              </Link>

              <Link
                href="/tickets"
                className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-2 rounded-xl border border-ui-border bg-ui-surface px-4 py-2 text-xs sm:text-sm font-semibold text-ui-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Ticket className="h-4 w-4 text-ui-muted-foreground" aria-hidden />
                <span>My Tickets</span>
              </Link>

              {(items.length === 0 || archivedItems.length > 0) && (
                <button
                  type="button"
                  onClick={handleResetDemo}
                  className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-1.5 rounded-xl border border-ui-border bg-ui-surface px-3 py-2 text-xs font-semibold text-ui-primary hover:bg-ui-surface-soft transition-colors cursor-pointer"
                  title="Restore sample notifications"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                  <span>Restore Demo Alerts</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Prototype Channels & Preferences Static Card */}
      <section className="rounded-2xl sm:rounded-3xl border border-ui-border bg-ui-surface p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ui-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5 text-ui-primary" aria-hidden />
          <span>Alert Channels & Preferences (Static Prototype)</span>
        </div>

        <div className="mt-3.5 grid gap-2.5 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-ui-border/70 bg-ui-surface-soft p-3">
            <span className="block text-[10px] font-semibold text-ui-muted-foreground uppercase">
              SMS Gate Dispatch
            </span>
            <span className="mt-0.5 block font-bold text-ui-foreground">
              +63 917 ••• ••89
            </span>
            <span className="mt-1 inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ Verified active
            </span>
          </div>

          <div className="rounded-xl border border-ui-border/70 bg-ui-surface-soft p-3">
            <span className="block text-[10px] font-semibold text-ui-muted-foreground uppercase">
              In-App Audio Chime
            </span>
            <span className="mt-0.5 block font-bold text-ui-foreground">
              Boarding Tone Active
            </span>
            <span className="mt-1 inline-block text-[10px] text-ui-muted-foreground">
              Plays at Bay call
            </span>
          </div>

          <div className="rounded-xl border border-ui-border/70 bg-ui-surface-soft p-3">
            <span className="block text-[10px] font-semibold text-ui-muted-foreground uppercase">
              Quiet Hours
            </span>
            <span className="mt-0.5 block font-bold text-ui-foreground">
              10:00 PM – 5:00 AM
            </span>
            <span className="mt-1 inline-block text-[10px] text-ui-muted-foreground">
              Critical alerts only
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
