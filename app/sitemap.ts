import type { MetadataRoute } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SITE_URL } from "@/lib/site";

// Páginas fixas + uma URL por edital aberto (é o que as pessoas buscam no
// Google: "edital X inscrições"). Se o banco não responder, sai só o fixo.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const fixed: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/oportunidades`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/assinatura`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/comecar`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const opps = (await convex.query(api.opportunities.list, { limit: 400 })) as { _id: string; lastSeenAt: number }[];
    return [
      ...fixed,
      ...opps.map((o) => ({
        url: `${SITE_URL}/sabatina/${o._id}`,
        lastModified: new Date(o.lastSeenAt),
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return fixed;
  }
}
