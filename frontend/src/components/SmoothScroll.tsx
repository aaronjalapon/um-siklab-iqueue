"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import { LENIS_OPTIONS } from "@/lib/lenis";

interface SmoothScrollProps {
  children: ReactNode;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia("(display-mode: standalone)");
  const pointerMql = window.matchMedia("(pointer: coarse)");
  mql.addEventListener("change", callback);
  pointerMql.addEventListener("change", callback);
  return () => {
    mql.removeEventListener("change", callback);
    pointerMql.removeEventListener("change", callback);
  };
}

function getSnapshot(): boolean {
  if (typeof window === "undefined") return true;
  const navigatorWithStandalone = navigator as Navigator & {
    standalone?: boolean;
  };
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true;
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
  // On mobile touch devices and standalone PWA mode, preserve native momentum scrolling
  return !isStandalone && !isTouchDevice;
}

function getServerSnapshot(): boolean {
  return true;
}

export default function SmoothScroll({ children }: SmoothScrollProps) {
  const isLenisEnabled = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  if (!isLenisEnabled) {
    return <>{children}</>;
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      {children}
    </ReactLenis>
  );
}
