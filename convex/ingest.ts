import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { MAPAS_SOURCES, fetchOpenOpportunities, opportunityUrl, toIso } from "../lib/mapas";

export const run = internalAction({
  handler: async (ctx) => {
    const results: { source: string; found: number; error?: string }[] = [];
    for (const source of MAPAS_SOURCES) {
      try {
        const opps = await fetchOpenOpportunities(source);
        for (const o of opps) {
          await ctx.runMutation(internal.opportunities.upsert, {
            source: source.baseUrl,
            sourceName: source.name,
            externalId: String(o.id),
            name: o.name,
            shortDescription: o.shortDescription ?? undefined,
            registrationFrom: toIso(o.registrationFrom),
            registrationTo: toIso(o.registrationTo),
            proponentTypes: o.registrationProponentTypes ?? [],
            categories: o.registrationCategories ?? [],
            totalResource: o.totalResource ?? undefined,
            vacancies: o.vacancies ?? undefined,
            ownerName: o.owner?.name ?? undefined,
            sourceUrl: opportunityUrl(source.baseUrl, o.id),
          });
        }
        results.push({ source: source.name, found: opps.length });
      } catch (e) {
        results.push({ source: source.name, found: 0, error: String(e) });
      }
    }
    return results;
  },
});
