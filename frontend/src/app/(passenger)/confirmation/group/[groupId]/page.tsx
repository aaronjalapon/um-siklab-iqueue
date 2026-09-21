"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import GroupBoardingPassCard from "@/components/boarding/GroupBoardingPassCard";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { getGroupBooking } from "@/lib/api";
import { uiStyles } from "@/lib/design-system";
import { getSavedGroupBoardingPass, saveGroupBoardingPass } from "@/lib/group-boarding-passes";
import type { GroupBookingResponse } from "@/lib/types";

export default function GroupConfirmationPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [booking, setBooking] = useState<GroupBookingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGroupBooking(groupId)
      .then((result) => {
        if (cancelled) return;
        setBooking(result);
        saveGroupBoardingPass(result);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        const saved = getSavedGroupBoardingPass(groupId);
        if (saved) {
          setBooking(saved);
        } else {
          setError(cause instanceof Error ? cause.message : "Combined pass not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [groupId]);

  if (loading) return <div className={`${uiStyles.pageContainer} max-w-4xl`}><div className={`${uiStyles.skeleton} h-[620px]`} /></div>;
  if (!booking) return <div className={`${uiStyles.pageContainer} max-w-xl`}><div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800"><h1 className="font-bold">Combined pass unavailable</h1><p className="mt-1 text-sm">{error}</p></div></div>;

  return (
    <div className={`${uiStyles.pageContainer} max-w-4xl`}>
      <Link href="/home" className="hidden md:inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-ui-primary hover:underline transition-colors"><ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Back home</Link>
      <BookingProgress current="pass" />
      <PageHeader eyebrow="Combined boarding pass" title="Group Booking Confirmed" description="Everyone was confirmed together. Present this single QR at the connected gate scanner." />
      <GroupBoardingPassCard booking={booking} />
    </div>
  );
}
