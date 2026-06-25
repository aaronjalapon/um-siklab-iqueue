"use client";

import { useEffect } from "react";
import {
  cleanupDevelopmentPwaState,
  shouldEnablePwaClientRuntime,
} from "@/lib/pwa-runtime";

export default function DevelopmentRuntimeGate({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const shouldEnablePwa = shouldEnablePwaClientRuntime();
    if (shouldEnablePwa) return;

    void cleanupDevelopmentPwaState();
  }, []);

  return <>{children}</>;
}
