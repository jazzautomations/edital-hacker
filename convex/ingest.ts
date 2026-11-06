import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { MAPAS_SOURCES, fetchOpenOpportunities, opportunityUrl, toIso, toStrArray, toNum } from "../lib/mapas";

export const run = internalAction({
  handler: async (ctx) => {
    const results: { source: string; found: number; upserted: number; error?: string }[] = [];
    for (const source of MAPAS_SOURCES) {
      try {
        const opps = await fetchOpenOpportunities(source);
        let upserted = 0;
        for (const o of opps) {
          try {
            await ctx.runMutation(internal.opportunities.upsert, {
              source: source.baseUrl,
              sourceName: source.name,
              externalId: String(o.id),
              name: o.name,
              shortDescription: o.shortDescription ?? undefined,
              registrationFrom: toIso(o.registrationFrom),
              registrationTo: toIso(o.registrationTo),
              proponentTypes: toStrArray(o.registrationProponentTypes),
              categories: toStrArray(o.registrationCategories),
              totalResource: toNum(o.totalResource),
              vacancies: toNum(o.vacancies),
              registrationLimitPerOwner: toNum(o.registrationLimitPerOwner),
              ownerName: o.owner?.name ?? undefined,
              sourceUrl: opportunityUrl(source.baseUrl, o.id),
            });
            upserted++;
          } catch {
            // registro malformado em uma instância não derruba o lote
          }
        }
        results.push({ source: source.name, found: opps.length, upserted });
      } catch (e) {
        results.push({ source: source.name, found: 0, upserted: 0, error: String(e) });
      }
    }
    return results;
  },
});
