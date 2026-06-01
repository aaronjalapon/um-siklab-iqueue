"use client";

import { useCallback, useState } from "react";
import { BoardingQueueTable } from "@/components/operator/BoardingQueueTable";
import { DataStatusBanner } from "@/components/operator/DataStatusBanner";
import { glassStyles } from "@/lib/design-system";
import {
  generateMockBoardingQueue,
  type BoardingQueueEntry,
} from "@/lib/operator-mock";

export default function OperatorQueuePage() {
  const [entries, setEntries] = useState<BoardingQueueEntry[]>(() =>
    generateMockBoardingQueue()
  );
  const [toast, setToast] = useState<string | null>(null);

  const handleMarkBoarded = useCallback((bookingId: string) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.bookingId === bookingId ? { ...e, status: "boarded" as const } : e
      )
    );
    setToast("Demo — marked as boarded (not persisted to server).");
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  return (
    <div className={glassStyles.pageContainer}>
      <header>
        <h1 className="text-2xl font-bold text-foreground">Boarding Queue</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Passengers by AI-assigned boarding window
        </p>
      </header>

      <DataStatusBanner message="Queue uses demo data — connect the backend for live boarding windows." />

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md px-4 py-3 rounded-xl bg-slate-900 text-white text-sm shadow-lg dark:bg-slate-100 dark:text-slate-900"
        >
          {toast}
        </div>
      )}

      <BoardingQueueTable entries={entries} onMarkBoarded={handleMarkBoarded} />
    </div>
  );
}
