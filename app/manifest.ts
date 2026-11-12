import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Manager: carreira de artista organizada",
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/inicio",
    display: "standalone",
    background_color: "#12100e",
    theme_color: "#12100e",
    lang: "pt-BR",
    categories: ["productivity", "music", "business"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
