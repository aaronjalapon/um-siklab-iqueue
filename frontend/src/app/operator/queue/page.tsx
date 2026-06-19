"use client";

import { useCallback, useState } from "react";
import { BoardingQueueTable } from "@/components/operator/BoardingQueueTable";
import { DataStatusBanner } from "@/components/operator/DataStatusBanner";
import { PageHeader } from "@/components/ui/PageHeader";
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
      <PageHeader
        eyebrow="Gate operations"
        title="Boarding Queue"
        description="Passengers grouped by AI-assigned boarding window."
      />

      <DataStatusBanner message="Queue uses demo data — connect the backend for live boarding windows." />

      {toast && (
        <div
          role="status"
          className="fixed bottom-24 left-3 right-3 z-50 rounded-xl bg-slate-900 px-4 py-3 text-center text-sm text-white shadow-lg dark:bg-slate-100 dark:text-slate-900 sm:left-1/2 sm:right-auto sm:max-w-md sm:-translate-x-1/2 md:bottom-6"
        >
          {toast}
        </div>
      )}

      <BoardingQueueTable entries={entries} onMarkBoarded={handleMarkBoarded} />
    </div>
  );
}
