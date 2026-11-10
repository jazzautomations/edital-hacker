import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";
import { searchMarkdown, scrapeMarkdown } from "../lib/firecrawl";
import { chat, jsonChat } from "../lib/llm";

// OSINT do contratante/financiador — antes de qualquer abordagem, o agente
// monta o dossiê: o que eles programam, vibe, quem já passou, contato certo
// e os GANCHOS DE RAPPORT que entram no email. É o que separa abordagem de
// gente grande de spam em massa.

const DOSSIER_SYSTEM = `Você é o pesquisador de um empresário artístico brasileiro. Com o material coletado, monte um DOSSIÊ operacional curto (máx ~400 palavras, markdown):
## Quem são — o que fazem/programam em 1-2 linhas
## Vibe & nicho — estilos, público, formato
## 👤 Quem agenda — a pessoa CERTA pra falar: nome+cargo (curador, booker, produtor de palco, direção artística) e canal (email direto > info@). Se não achar nome, diga qual o cargo provável e como descobrir (ligar, perguntar na porta, LinkedIn).
## Pistas de rapport — 3-5 ganchos CONCRETOS pra citar na abordagem (show recente, projeto, linguagem que eles usam)
## Como abordar — canal certo, tom, o que oferecer de cara
## ⚠ Sinais — red flags ou o que evitar (só se houver)
Só afirme o que estiver no material; se algo não apareceu, diga "não achei". Sem floreio.`;

// action pública (o Next chama via ConvexHttpClient no coach). Só pesquisa
// e escreve no doc-alvo — sem acesso a dados além do alvo informado.
export const research = action({
  args: {
    targetType: v.union(v.literal("lead"), v.literal("opportunity")),
    id: v.string(), // id do doc (generic pra aceitar ambas tabelas)
    profileId: v.id("profiles"),
    name: v.string(),
    city: v.optional(v.string()),
    uf: v.optional(v.string()),
    kind: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    hint: v.optional(v.string()), // contexto do artista
  },
  handler: async (ctx, args) => {
    // Firecrawl bloqueia Instagram/TikTok — Sympla expõe agenda+produtora+preço.
    const queries =
      args.targetType === "lead"
        ? [
            `"${args.name}" ${args.city ?? ""} ${args.uf ?? ""} ${args.kind === "casa_de_show" ? "casa de shows agenda programação" : args.kind ?? "contratante"}`,
            `"${args.name}" sympla eventos`,
            `"${args.name}" booking contato produção cachê`,
            `"${args.name}" curador OR curadoria OR "direção artística" OR booker`,
            ...(args.kind === "marca" ? [`"${args.name}" patrocínio incentivo cultural salic versalic`] : []),
          ]
        : [
            `"${args.name}" edital resultados anteriores contemplados aprovados`,
            `"${args.name}" avaliação critérios júri banca`,
          ];

    const chunks: string[] = [];
    const sources: string[] = [];
    if (args.sourceUrl) {
      try {
        const md = await scrapeMarkdown(args.sourceUrl);
        chunks.push(`### Site oficial\n${md.slice(0, 5000)}`);
        sources.push(args.sourceUrl);
      } catch { /* site fora do ar — segue com search */ }
    }
    for (const q of queries.slice(0, 5)) {
      try {
        const r = await searchMarkdown(q, 3);
        if (r.markdown) chunks.push(r.markdown);
        sources.push(...r.sources);
      } catch { /* uma busca falhou — continua */ }
    }
    if (!chunks.length) throw new Error("nada encontrado — alvo muito obscuro ou Firecrawl sem acesso");

    const text = await chat([
      { role: "system", content: DOSSIER_SYSTEM },
      {
        role: "user",
        content: `ALVO: ${args.name}${args.kind ? ` (${args.kind})` : ""}${args.city ? ` — ${args.city}/${args.uf ?? ""}` : ""}
CONTEXTO DO ARTISTA: ${args.hint ?? "artista independente prospectando trabalho"}

MATERIAL COLETADO:
${chunks.join("\n\n---\n\n")}`,
      },
    ]);

    const final = `${text}\n\n---\nFontes: ${[...new Set(sources)].slice(0, 6).join(" · ")}`;

    if (args.targetType === "lead") {
      await ctx.runMutation(internal.leads.setDossier, {
        id: args.id as any,
        dossier: final,
      });

      // Quem agenda? Extrai pessoas nomeadas do material → vira contato
      // (info@ = <2% resposta; booker nomeado = 15-25%).
      try {
        const people = await jsonChat<{ people: { name: string; role?: string; email?: string; phone?: string }[] }>(
          `Extraia PESSOAS FÍSICAS nomeadas que programam/curam/agendam o alvo (curador, booker, produtor, direção artística, programador). Só o que estiver explícito no material — nunca invente nome nem email. Responda SÓ JSON {"people":[{"name","role","email","phone"}]} ou {"people":[]}.`,
          chunks.join("\n\n").slice(0, 10000)
        );
        const existing = (await ctx.runQuery(api.contacts.listForProfile, {
          profileId: args.profileId,
        })) as any[];
        for (const p of (people?.people ?? []).slice(0, 4)) {
          if (!p.name || existing.some((e) => e.name?.toLowerCase() === p.name.toLowerCase())) continue;
          await ctx.runMutation(api.contacts.add, {
            profileId: args.profileId,
            name: p.name,
            role: p.role,
            org: args.name,
            email: p.email,
            phone: p.phone,
            notes: `OSINT dossiê ${args.name}`,
          });
        }
      } catch { /* extração de gente é bônus — dossiê já vale */ }
    } else {
      await ctx.runMutation(internal.opportunities.setIntel, {
        id: args.id as any,
        intel: final,
      });
    }
    return final;
  },
});
