import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { scrapeMarkdown } from "../lib/firecrawl";
import { structureEdital } from "../lib/editalParse";

export const enrich = internalAction({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => {
    const opp = await ctx.runQuery(api.opportunities.get, { id: args.id });
    if (!opp) throw new Error("opportunity not found");
    const markdown = await scrapeMarkdown(opp.sourceUrl);
    const enriched = await structureEdital(markdown, opp.name);
    await ctx.runMutation(internal.opportunities.setEnriched, {
      id: args.id,
      rawMarkdown: markdown,
      enriched,
    });
    return { ok: true };
  },
});

export const enrichBatch = internalAction({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<{ id: string; ok: boolean; error?: string }[]> => {
    const items: any[] = await ctx.runQuery(api.opportunities.list, { limit: args.limit ?? 10 });
    const out: { id: string; ok: boolean; error?: string }[] = [];
    for (const o of items.filter((i: any) => !i.enriched)) {
      try {
        await ctx.runAction(internal.enrich.enrich, { id: o._id });
        out.push({ id: o._id, ok: true });
      } catch (e) {
        out.push({ id: o._id, ok: false, error: String(e) });
      }
    }
    return out;
  },
});
