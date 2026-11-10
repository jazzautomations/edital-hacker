import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { searchMarkdown, scrapeMarkdown } from "../lib/firecrawl";
import { chat } from "../lib/llm";

// OSINT do contratante/financiador — antes de qualquer abordagem, o agente
// monta o dossiê: o que eles programam, vibe, quem já passou, contato certo
// e os GANCHOS DE RAPPORT que entram no email. É o que separa abordagem de
// gente grande de spam em massa.

const DOSSIER_SYSTEM = `Você é o pesquisador de um empresário artístico brasileiro. Com o material coletado, monte um DOSSIÊ operacional curto (máx ~400 palavras, markdown):
## Quem são — o que fazem/programam em 1-2 linhas
## Vibe & nicho — estilos, público, formato
## Pistas de rapport — 3-5 ganchos CONCRETOS pra citar na abordagem (show recente, projeto, linguagem que eles usam)
## Como abordar — canal certo (booking/produção/direção), tom, o que oferecer de cara
## ⚠ Sinais — red flags ou o que evitar (só se houver)
Só afirme o que estiver no material; se algo não apareceu, diga "não achei". Sem floreio.`;

// action pública (o Next chama via ConvexHttpClient no coach). Só pesquisa
// e escreve no doc-alvo — sem acesso a dados além do alvo informado.
export const research = action({
  args: {
    targetType: v.union(v.literal("lead"), v.literal("opportunity")),
    id: v.string(), // id do doc (generic pra aceitar ambas tabelas)
    name: v.string(),
    city: v.optional(v.string()),
    uf: v.optional(v.string()),
    kind: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    hint: v.optional(v.string()), // contexto do artista
  },
  handler: async (ctx, args) => {
    const queries =
      args.targetType === "lead"
        ? [
            `"${args.name}" ${args.city ?? ""} ${args.uf ?? ""} ${args.kind === "casa_de_show" ? "casa de shows programação agenda" : args.kind ?? "contratante"}`,
            `"${args.name}" booking contato produção cachê`,
            `site:instagram.com "${args.name}" ${args.city ?? ""}`,
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
    for (const q of queries.slice(0, 3)) {
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
    } else {
      await ctx.runMutation(internal.opportunities.setIntel, {
        id: args.id as any,
        intel: final,
      });
    }
    return final;
  },
});
