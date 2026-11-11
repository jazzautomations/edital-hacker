import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { searchPncp, pncpUrl, isArtistic, extractArtist } from "../lib/pncp";

// Scanner PNCP — dois modos:
// (a) credenciamentos/editais ABERTOS → viram opportunities (source "pncp")
// (b) contratos de inexigibilidade recentes → benchmark de cachê global
const OPEN_QUERIES = [
  "credenciamento artistas",
  "credenciamento shows apresentações artísticas",
  "apresentações artísticas culturais artistas",
];
const CONTRACT_QUERIES = [
  "apresentação show musical artista",
  "show banda cantor",
];

export const scanPncp = internalAction({
  handler: async (ctx) => {
    const results: Record<string, unknown> = {};
    const safeKey = (s: string) =>
      s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^ -~]/g, "_").slice(0, 30);

    // (a) Editais/credenciamentos recebendo proposta
    let oppUpserted = 0;
    for (const q of OPEN_QUERIES) {
      try {
        const { items } = await searchPncp({
          q,
          tipos: "edital",
          status: "recebendo_proposta",
          tam: 50,
        });
        for (const it of items) {
          const text = `${it.title ?? ""} ${it.description ?? ""}`;
          if (!isArtistic(text)) continue;
          const url = pncpUrl(it);
          const extId = it.numero_controle_pncp ?? it.item_url;
          if (!url || !extId) continue;
          await ctx.runMutation(internal.opportunities.upsert, {
            source: "pncp",
            sourceName: "PNCP — contratação pública",
            externalId: extId,
            name: (it.title ?? it.description ?? "Credenciamento PNCP").slice(0, 180),
            shortDescription: `${it.orgao_nome ?? ""} — ${it.municipio_nome ?? ""}/${it.uf ?? ""}. ${(it.description ?? "").slice(0, 400)}`,
            proponentTypes: [],
            categories: ["contratação pública", "credenciamento"],
            sourceUrl: url,
          });
          oppUpserted++;
        }
      } catch (e) {
        results[`open_err_${safeKey(q)}`] = String(e);
      }
    }

    // (b) Benchmark de cachê — contratos de inexigibilidade recentes
    let benchUpserted = 0;
    for (const q of CONTRACT_QUERIES) {
      try {
        const { items } = await searchPncp({
          q,
          tipos: "contrato",
          tam: 50,
        });
        for (const it of items) {
          const text = `${it.title ?? ""} ${it.description ?? ""}`;
          if (!isArtistic(text)) continue;
          const extId = it.numero_controle_pncp;
          if (!extId) continue;
          await ctx.runMutation(internal.pncp.upsertContract, {
            externalId: extId,
            description: it.description ?? it.title ?? "",
            artistName: extractArtist(it.description),
            fornecedor: it.fornecedor_nome,
            orgao: it.orgao_nome,
            municipio: it.municipio_nome,
            uf: it.uf,
            codigoIbge: it.codigo_ibge,
            valorGlobal: it.valor_global,
            dataAssinatura: it.data_assinatura,
            url: pncpUrl(it),
          });
          benchUpserted++;
        }
      } catch (e) {
        results[`bench_err_${safeKey(q)}`] = String(e);
      }
    }

    return { oppUpserted, benchUpserted, ...results };
  },
});

export const upsertContract = internalMutation({
  args: {
    externalId: v.string(),
    description: v.string(),
    artistName: v.optional(v.string()),
    fornecedor: v.optional(v.string()),
    orgao: v.optional(v.string()),
    municipio: v.optional(v.string()),
    uf: v.optional(v.string()),
    codigoIbge: v.optional(v.string()),
    valorGlobal: v.optional(v.number()),
    dataAssinatura: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pncpContracts")
      .withIndex("by_external", (q) => q.eq("externalId", args.externalId))
      .first();
    if (existing) return existing._id;
    return await ctx.db.insert("pncpContracts", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Benchmark consultável — coach e UI: "quanto cidade X/UF Y pagou por show".
export const benchmark = action({
  args: { uf: v.optional(v.string()), q: v.optional(v.string()) },
  handler: async (ctx, args) => {
    // Query real-time no PNCP (o banco interno acumula via cron; a consulta
    // ao vivo cobre artista/município específico sob demanda).
    const { items, total } = await searchPncp({
      q: args.q ?? "apresentação show musical artista",
      tipos: "contrato",
      uf: args.uf,
      tam: 50,
    });
    const hits = items
      .filter((it) => isArtistic(`${it.title ?? ""} ${it.description ?? ""}`) && it.valor_global)
      .map((it) => ({
        artista: extractArtist(it.description) ?? it.fornecedor_nome,
        municipio: it.municipio_nome,
        uf: it.uf,
        valor: it.valor_global,
        data: it.data_assinatura,
        descricao: (it.description ?? "").slice(0, 160),
        url: pncpUrl(it),
      }));
    const values = hits.map((h) => h.valor!).sort((a, b) => a - b);
    const mediana = values.length
      ? values[Math.floor(values.length / 2)]
      : undefined;
    return { total, amostra: hits.length, mediana, contratos: hits.slice(0, 15) };
  },
});
