"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, QrCode, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { verifyBoardingPass } from "@/lib/api";
import { glassStyles } from "@/lib/design-system";
import type { BoardingVerifyResponse } from "@/lib/types";

export default function BoardingScannerPage() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<BoardingVerifyResponse | null>(null);
  const [status, setStatus] = useState<"idle" | "checking" | "error">("idle");

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) return;
    setStatus("checking");
    try {
      setResult(await verifyBoardingPass(token.trim()));
      setStatus("idle");
    } catch {
      setResult(null);
      setStatus("error");
    }
  }

  return (
    <div className={glassStyles.pageContainer}>
      <PageHeader
        eyebrow="Terminal gate"
        title="Boarding Pass Verification"
        description="Verify authenticity, booking state, and boarding-window eligibility."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.6fr)]">
        <form onSubmit={verify} className={`${glassStyles.panel} p-5`}>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            QR token
            <textarea
              value={token}
              onChange={(event) => setToken(event.target.value)}
              className={`${glassStyles.input} mt-2 min-h-40 font-mono text-xs`}
              placeholder="Scan or paste the signed boarding token"
              required
            />
          </label>
          <button
            type="submit"
            disabled={status === "checking"}
            className={`${glassStyles.primaryButton} mt-4 inline-flex items-center gap-2`}
          >
            <QrCode className="h-4 w-4" aria-hidden />
            {status === "checking" ? "Verifying" : "Verify Pass"}
          </button>
          {status === "error" && (
            <p className="mt-3 text-sm text-red-600">The verification service is unavailable.</p>
          )}
        </form>

        <section className={`${glassStyles.panel} p-5`} aria-live="polite">
          {!result ? (
            <p className="text-sm text-slate-500">Verification results appear here.</p>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-center gap-2 ${result.valid ? "text-green-700" : "text-red-700"}`}>
                {result.valid ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                <h2 className="text-lg font-semibold">{result.valid ? "Ready to board" : "Pass blocked"}</h2>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <dt className="text-slate-500">Reason</dt><dd className="font-medium capitalize">{result.reason.replaceAll("_", " ")}</dd>
                <dt className="text-slate-500">Seat</dt><dd className="font-medium">{result.seat ?? "Unknown"}</dd>
                <dt className="text-slate-500">Signature</dt><dd className="font-medium">{result.signature_valid ? "Valid" : "Invalid"}</dd>
                <dt className="text-slate-500">Window</dt><dd className="break-all font-medium">{result.boarding_window ?? "Unknown"}</dd>
              </dl>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
