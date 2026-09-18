"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

export function smoothScrollTo(target: string | HTMLElement, offset = 0) {
  if (typeof window === "undefined") return;

  const isHero = typeof target === "string" && (target === "#hero" || target === "#");

  const targetEl =
    typeof target === "string"
      ? (isHero
          ? document.getElementById("hero") || document.body
          : document.querySelector(target))
      : target;

  if (!isHero && !targetEl) return;

  const effectiveOffset = isHero ? 0 : offset;
  const lenis = window.__lenis;

  if (lenis) {
    lenis.scrollTo(isHero ? 0 : (targetEl as HTMLElement), {
      offset: effectiveOffset,
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });
  } else {
    if (isHero) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (targetEl) {
      const top = (targetEl as HTMLElement).getBoundingClientRect().top + window.scrollY + effectiveOffset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }

  if (typeof target === "string" && target.startsWith("#")) {
    window.history.pushState(null, "", target);
  }
}

export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect reduced motion settings
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    window.__lenis = lenis;

    let rafId: number;
    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }
    rafId = requestAnimationFrame(raf);

    // Global click listener for in-page hash links to guarantee smooth scrolling
    const handleHashClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || !href.startsWith("#") || href === "#") return;

      e.preventDefault();
      smoothScrollTo(href);
    };

    document.addEventListener("click", handleHashClick);

    return () => {
      document.removeEventListener("click", handleHashClick);
      cancelAnimationFrame(rafId);
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  return null;
}
