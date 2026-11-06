import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { discoverOpportunities } from "../lib/firecrawl";

// Instâncias Mapas com WAF bloqueando a API direta (403) — o agent do
// Firecrawl navega pela infra deles e contorna.
const BLOCKED_SOURCES = [
  { name: "Mapa Cultural do DF", baseUrl: "https://mapa.cultura.df.gov.br" },
  { name: "Mapa Cultural do Maranhão", baseUrl: "https://ma.mapas.cultura.gov.br" },
];

export const discoverSource = internalAction({
  args: { sourceName: v.string(), baseUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const found = await discoverOpportunities(args.sourceName, args.baseUrl);
    const today = new Date().toISOString();
    let upserted = 0;
    for (const o of found) {
      if (!o.sourceUrl) continue;
      if (o.registrationTo && o.registrationTo < today) continue;
      await ctx.runMutation(internal.opportunities.upsert, {
        source: `agent:${args.baseUrl ?? args.sourceName}`,
        sourceName: args.sourceName,
        externalId: o.sourceUrl,
        name: o.name,
        shortDescription: o.shortDescription,
        registrationTo: o.registrationTo,
        proponentTypes: [],
        categories: [],
        sourceUrl: o.sourceUrl,
      });
      upserted++;
    }
    return { source: args.sourceName, found: found.length, upserted };
  },
});

export const discoverBlocked = internalAction({
  handler: async (ctx): Promise<{ source: string; found: number; upserted: number; error?: string }[]> => {
    const results: { source: string; found: number; upserted: number; error?: string }[] = [];
    for (const s of BLOCKED_SOURCES) {
      try {
        results.push(
          await ctx.runAction(internal.discover.discoverSource, {
            sourceName: s.name,
            baseUrl: s.baseUrl,
          })
        );
      } catch (e) {
        results.push({ source: s.name, found: 0, upserted: 0, error: String(e) });
      }
    }
    return results;
  },
});
