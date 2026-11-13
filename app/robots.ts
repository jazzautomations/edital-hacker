import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Público: home, radar, páginas de edital, planos. Área logada e API ficam fora.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/inicio", "/pipeline", "/agenda", "/prospeccao", "/documentos", "/assinaturas", "/assinar/", "/coach", "/rider", "/prestacao", "/login", "/callback", "/sair"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
