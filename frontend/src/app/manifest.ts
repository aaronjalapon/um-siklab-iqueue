import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "IQueue",
    short_name: "IQueue",
    description:
      "AI-powered smart boarding and QR passes for inter-provincial bus terminals.",
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
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
