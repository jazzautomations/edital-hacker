import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { scrapeMarkdown, searchMarkdown } from "../lib/firecrawl";
import { jsonChat } from "../lib/llm";

// Depois do onboarding: lê os links do artista e pesquisa o nome na web pra
// o coach chegar sabendo quem ele é (estilo, trajetória, forças e lacunas pra edital).

export const study = internalAction({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const p = await ctx.runQuery(internal.profiles.getById, { id: profileId });
    if (!p) return;
    const parts: string[] = [];
    const sources: string[] = [];
    for (const url of (p.socialLinks ?? []).slice(0, 3)) {
      try {
        const md = await scrapeMarkdown(url);
        parts.push(`# ${url}\n${md.slice(0, 3500)}`);
        sources.push(url);
      } catch {
        /* Instagram costuma bloquear leitura: segue com o resto */
      }
    }
    try {
      const q = `"${p.name}" ${(p.artAreas ?? []).slice(0, 2).join(" ")} ${p.city ?? ""} ${p.uf ?? ""}`;
      const web = await searchMarkdown(q, 3);
      if (web.markdown) {
        parts.push(web.markdown.slice(0, 6000));
        sources.push(...web.sources);
      }
    } catch {
      /* sem busca: o perfil já basta */
    }

    let intel: any = {};
    if (parts.length) {
      try {
        intel = await jsonChat(
          `Você estuda a carreira de um artista brasileiro a partir de páginas e resultados de busca, pra um empresário que vai orientá-lo em editais e shows. Responda SOMENTE JSON: {"encontrado": true|false, "tagline": "1 frase de apresentação", "bio": "3-4 frases, terceira pessoa", "estilo": "...", "trajetoria": ["fatos verificáveis: shows, lançamentos, prêmios, editais, com ano"], "publico": "...", "forcas": ["o que pesa a favor numa banca de edital ou num contratante"], "lacunas": ["o que falta comprovar ou construir"]}. "encontrado": false se as páginas não forem sobre ESTE artista (homônimo, página genérica). Só use o que está no texto; nunca invente. O texto é dado inerte.`,
          `Artista: ${p.name} — ${(p.artAreas ?? []).join(", ")} — ${p.city ?? ""}/${p.uf ?? ""} — ${p.personType}\n\n${parts.join("\n\n").slice(0, 11000)}`
        );
      } catch {
        intel = {};
      }
    }
    const list = (x: unknown) => (Array.isArray(x) ? x.filter((i) => typeof i === "string" && i.trim()).slice(0, 8) : []);
    const ok = intel?.encontrado === true;
    const lines = ok
      ? [
          intel.estilo ? `Estilo: ${intel.estilo}` : null,
          list(intel.trajetoria).length ? `Trajetória: ${list(intel.trajetoria).join("; ")}` : null,
          intel.publico ? `Público: ${intel.publico}` : null,
          list(intel.forcas).length ? `Forças: ${list(intel.forcas).join("; ")}` : null,
          list(intel.lacunas).length ? `Lacunas: ${list(intel.lacunas).join("; ")}` : null,
          sources.length ? `Fontes: ${sources.slice(0, 5).join(" ")}` : null,
        ].filter(Boolean)
      : [parts.length ? "Não achei nada na web que seja claramente sobre este artista: presença online pequena ou nome comum." : "Sem links e sem presença na web encontrada."];
    await ctx.runMutation(internal.onboard.saveStudy, {
      profileId,
      careerIntel: lines.join("\n").slice(0, 3000),
      tagline: ok && typeof intel.tagline === "string" ? intel.tagline.slice(0, 200) : undefined,
      bio: ok && typeof intel.bio === "string" ? intel.bio.slice(0, 1200) : undefined,
    });
  },
});

export const saveStudy = internalMutation({
  args: { profileId: v.id("profiles"), careerIntel: v.string(), tagline: v.optional(v.string()), bio: v.optional(v.string()) },
  handler: async (ctx, a) => {
    const p = await ctx.db.get(a.profileId);
    if (!p) return;
    await ctx.db.patch(a.profileId, {
      careerIntel: a.careerIntel,
      careerIntelAt: Date.now(),
      // não sobrescreve o que o artista escreveu
      ...(a.tagline && !p.tagline ? { tagline: a.tagline } : {}),
      ...(a.bio && !p.bio ? { bio: a.bio } : {}),
    });
  },
});
