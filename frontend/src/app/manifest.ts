import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";
import { SHOULD_ENABLE_PWA } from "@/lib/pwa-runtime";

export default function manifest(): MetadataRoute.Manifest {
  if (!SHOULD_ENABLE_PWA) {
    return {
      name: BRAND.name,
      short_name: BRAND.name,
      description: BRAND.shortDescription,
      start_url: "/home",
      scope: "/",
      display: "browser",
      background_color: "#FCFCFD",
      theme_color: "#1A73E8",
      lang: "en",
      icons: [],
    };
  }

  return {
    name: BRAND.name,
    short_name: BRAND.name,
    description: BRAND.shortDescription,
    start_url: "/home",
    scope: "/",
    display: "standalone",
    background_color: "#FCFCFD",
    theme_color: "#1A73E8",
    orientation: "portrait-primary",
    categories: ["travel", "transportation", "productivity"],
    lang: "en",
    icons: [
      {
        src: "/icons/tripsync-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/tripsync-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/tripsync-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/tripsync-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
