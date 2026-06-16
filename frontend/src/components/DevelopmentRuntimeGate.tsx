"use client";

import { useEffect, useState } from "react";
import { cleanupDevelopmentPwaState, SHOULD_ENABLE_PWA } from "@/lib/pwa-runtime";

export default function DevelopmentRuntimeGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(SHOULD_ENABLE_PWA);

  useEffect(() => {
    if (SHOULD_ENABLE_PWA) return;

    let cancelled = false;

    async function prepareDevelopmentRuntime() {
      try {
        await cleanupDevelopmentPwaState();
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    void prepareDevelopmentRuntime();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;
  }

  return <>{children}</>;
}
