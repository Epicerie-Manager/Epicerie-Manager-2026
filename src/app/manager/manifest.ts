import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/manager",
    name: "Application manager",
    short_name: "Manager",
    description: "Application manager mobile Épicerie Villebon 2",
    start_url: "/manager/login",
    scope: "/manager",
    display: "standalone",
    background_color: "#f8f3ee",
    theme_color: "#9f1239",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
