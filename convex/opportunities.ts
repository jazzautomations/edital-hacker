import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const list = query({
  args: {
    area: v.optional(v.string()),
    proponentType: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const items = await ctx.db
      .query("opportunities")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();
    const filtered = items
      .filter((o) => !o.registrationTo || o.registrationTo >= now)
      .filter((o) => !args.area || o.categories.some((c) => c.toLowerCase().includes(args.area!.toLowerCase())))
      .filter(
        (o) =>
          !args.proponentType ||
          o.proponentTypes.length === 0 ||
          o.proponentTypes.some((t) => t.toLowerCase().includes(args.proponentType!.toLowerCase()))
      );
    // Dedup cross-fonte (FR-003): mesmo nome normalizado + mesmo dia de
    // fechamento = mesmo edital em fontes diferentes → fica a versão
    // enriquecida, senão a primeira.
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
    const byKey = new Map<string, (typeof filtered)[number]>();
    for (const o of filtered) {
      // Compras públicas (PNCP) repetem o título ("Edital de Chamamento nº 6/2026")
      // em prefeituras diferentes — o id externo entra na chave pra não fundir.
      const key = o.source === "pncp"
        ? `pncp|${o.externalId}`
        : `${norm(o.name)}|${o.registrationTo?.slice(0, 10) ?? "?"}`;
      const cur = byKey.get(key);
      if (!cur || (!cur.enriched && o.enriched)) byKey.set(key, o);
    }
    // Com prazo primeiro (o que fecha antes no topo); sem prazo no fim.
    return [...byKey.values()]
      .sort((a, b) => {
        if (!a.registrationTo !== !b.registrationTo) return a.registrationTo ? -1 : 1;
        return (a.registrationTo ?? "").localeCompare(b.registrationTo ?? "") || b.lastSeenAt - a.lastSeenAt;
      })
      .slice(0, args.limit ?? 100)
      // a lista não precisa do texto bruto do edital (pesava a página inteira)
      .map(({ rawMarkdown: _raw, ...o }) => o);
  },
});

export const get = query({
  args: { id: v.id("opportunities") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

export const countBySource = query({
  handler: async (ctx) => {
    const items = await ctx.db.query("opportunities").collect();
    const bySource: Record<string, number> = {};
    for (const o of items) bySource[o.sourceName] = (bySource[o.sourceName] ?? 0) + 1;
    // array — nomes de fonte com acento não podem virar chave de objeto (Convex exige ASCII)
    return Object.entries(bySource).map(([source, count]) => ({ source, count }));
  },
});

export const upsert = internalMutation({
  args: {
    source: v.string(),
    sourceName: v.string(),
    externalId: v.string(),
    name: v.string(),
    shortDescription: v.optional(v.string()),
    registrationFrom: v.optional(v.string()),
    registrationTo: v.optional(v.string()),
    proponentTypes: v.array(v.string()),
    categories: v.array(v.string()),
    totalResource: v.optional(v.number()),
    vacancies: v.optional(v.number()),
    registrationLimitPerOwner: v.optional(v.number()),
    ownerName: v.optional(v.string()),
    sourceUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("opportunities")
      .withIndex("by_source_external", (q) =>
        q.eq("source", args.source).eq("externalId", args.externalId)
      )
      .unique();
    const patch = { ...args, status: "open", lastSeenAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("opportunities", patch);
  },
});

export const setIntel = internalMutation({
  args: { id: v.id("opportunities"), intel: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { intel: args.intel, intelAt: Date.now() });
  },
});

export const setEnriched = internalMutation({
  args: {
    id: v.id("opportunities"),
    rawMarkdown: v.string(),
    enriched: v.object({
      summary: v.optional(v.string()),
      eligibility: v.optional(v.string()),
      disqualifiers: v.array(v.string()),
      requiredDocs: v.array(v.string()),
      rubric: v.array(v.object({ criterion: v.string(), weight: v.optional(v.string()) })),
      deadlines: v.array(v.object({ label: v.string(), date: v.string() })),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { rawMarkdown: args.rawMarkdown, enriched: args.enriched });
  },
});

const readingValidator = v.object({
  summary: v.optional(v.string()),
  eligibility: v.optional(v.string()),
  disqualifiers: v.array(v.string()),
  requiredDocs: v.array(v.string()),
  rubric: v.array(v.object({ criterion: v.string(), weight: v.optional(v.string()) })),
  deadlines: v.array(v.object({ label: v.string(), date: v.string() })),
});

/** Leitura do edital feita pelo coach no servidor do app (protegida pelo segredo do servidor). */
export const saveReading = mutation({
  args: { secret: v.string(), id: v.id("opportunities"), rawMarkdown: v.string(), enriched: readingValidator },
  handler: async (ctx, args) => {
    if (!process.env.NOTIFY_SECRET || args.secret !== process.env.NOTIFY_SECRET) throw new Error("não autorizado");
    await ctx.db.patch(args.id, { rawMarkdown: args.rawMarkdown.slice(0, 200000), enriched: args.enriched });
  },
});
