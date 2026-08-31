"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, QrCode, WifiOff } from "lucide-react";
import GroupBoardingPassCard from "@/components/boarding/GroupBoardingPassCard";
import { BookingProgress } from "@/components/ui/BookingProgress";
import { PageHeader } from "@/components/ui/PageHeader";
import { getGroupBooking } from "@/lib/api";
import { glassStyles } from "@/lib/design-system";
import { getSavedGroupBoardingPass, saveGroupBoardingPass } from "@/lib/group-boarding-passes";
import type { GroupBookingResponse } from "@/lib/types";

export default function GroupConfirmationPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [booking, setBooking] = useState<GroupBookingResponse | null>(null);
  const [savedCopy, setSavedCopy] = useState(false);
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
          setSavedCopy(true);
        } else {
          setError(cause instanceof Error ? cause.message : "Combined pass not found");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [groupId]);

  if (loading) return <div className={`${glassStyles.pageContainer} max-w-4xl`}><div className={`${glassStyles.skeleton} h-[620px]`} /></div>;
  if (!booking) return <div className={`${glassStyles.pageContainer} max-w-xl`}><div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-6 text-red-800"><h1 className="font-bold">Combined pass unavailable</h1><p className="mt-1 text-sm">{error}</p></div></div>;

  return (
    <div className={`${glassStyles.pageContainer} max-w-5xl`}>
      <Link href="/home" className="inline-flex items-center gap-1 text-sm text-brand-blue hover:underline"><ArrowLeft className="h-4 w-4" /> Back home</Link>
      <BookingProgress current="pass" />
      <PageHeader eyebrow="Combined boarding pass" title="Family Booking Confirmed" description="Everyone was confirmed together. Present this single QR at the connected gate scanner." />
      {savedCopy && <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900"><WifiOff className="h-4 w-4" /> Showing the pass saved on this device.</div>}
      <GroupBoardingPassCard booking={booking} savedCopy={savedCopy} />
      <Link href="/operator/scanner" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 font-bold text-white"><QrCode className="h-4 w-4" /> Open online gate scanner</Link>
    </div>
  );
}
