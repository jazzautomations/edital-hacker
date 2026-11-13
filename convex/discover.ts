import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { discoverOpportunities, discoverLeads, discoverAgencySources } from "../lib/firecrawl";

// a IA às vezes devolve null/número onde o banco espera texto
const txt = (x: unknown, max = 600): string | undefined =>
  typeof x === "string" && x.trim() ? x.trim().slice(0, max) : typeof x === "number" ? String(x) : undefined;

// Instâncias Mapas com WAF bloqueando a API direta (403) — o agent do
// Firecrawl navega pela infra deles e contorna.
const BLOCKED_SOURCES = [
  { name: "Mapa Cultural do DF", baseUrl: "https://mapa.cultura.df.gov.br" },
  { name: "Mapa Cultural do Maranhão", baseUrl: "https://ma.mapas.cultura.gov.br" },
  // WAF 403 confirmado 08/dez — API Mapas existe mas bloqueia non-browser
  { name: "Rede das Artes (Funarte)", baseUrl: "https://rededasartes.cultura.gov.br" },
  { name: "Cultura Viva", baseUrl: "https://culturaviva.cultura.gov.br" },
  { name: "Mapa Cultural BH", baseUrl: "https://mapaculturalbh.pbh.gov.br" },
  // Falham do Convex cloud (403/timeout) mas a instância existe — o agent
  // navega pela infra deles. Confirmado no ingest de 10/nov.
  { name: "Mapa Cultural de Pernambuco", baseUrl: "https://www.mapacultural.pe.gov.br" },
  { name: "Mapa Cultural de MT", baseUrl: "https://mapas.mt.gov.br" },
  { name: "Mapas de Sergipe", baseUrl: "https://mapacultural.se.gov.br" },
  { name: "SPCultura", baseUrl: "https://spcultura.prefeitura.sp.gov.br" },
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

// Prospecção comercial: o artista pede, o agente caça leads reais fora dos
// editais — casas de show, festivais, marcas, escolas. Pública (chamada pela UI).
export const prospectLeads = action({
  args: {
    profileId: v.id("profiles"),
    leadType: v.string(),
    niche: v.string(),
    city: v.string(),
    uf: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ found: number; upserted: number; error?: string }> => {
    try {
      const found = await discoverLeads(args.leadType, args.niche, args.city, args.uf);
      let upserted = 0;
      for (const l of found) {
        if (!txt(l.name)) continue;
        await ctx.runMutation(internal.leads.upsert, {
          profileId: args.profileId,
          name: txt(l.name, 200)!,
          kind: txt(l.type, 40) ?? args.leadType,
          city: args.city,
          uf: args.uf,
          sourceUrl: txt(l.url, 500),
          contact: txt(l.contact, 300),
          description: txt(l.description),
        });
        upserted++;
      }
      return { found: found.length, upserted };
    } catch (e) {
      return { found: 0, upserted: 0, error: String(e) };
    }
  },
});

/** Fonte da fonte: contratantes que compram show dos artistas de uma agência viram leads. */
export const mapAgency = action({
  args: { profileId: v.id("profiles"), agency: v.string(), niche: v.string(), region: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ artists: string[]; found: number; upserted: number; error?: string }> => {
    try {
      const r = await discoverAgencySources(args.agency, args.niche, args.region);
      let upserted = 0;
      for (const l of r.venues.slice(0, 30)) {
        if (!txt(l.name)) continue;
        await ctx.runMutation(internal.leads.upsert, {
          profileId: args.profileId,
          name: txt(l.name, 200)!,
          kind: txt(l.type, 40) ?? "contratante",
          city: txt((l as any).city, 100),
          sourceUrl: txt(l.url, 500),
          contact: txt(l.contact, 300),
          description: `Via agência ${r.agency ?? args.agency}: ${l.description ?? "contrata artistas do casting"}`.slice(0, 600),
        });
        upserted++;
      }
      return { artists: r.artists.slice(0, 20), found: r.venues.length, upserted };
    } catch (e) {
      return { artists: [], found: 0, upserted: 0, error: String(e).slice(0, 200) };
    }
  },
});
