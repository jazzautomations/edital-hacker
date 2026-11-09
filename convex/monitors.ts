import { internalAction } from "./_generated/server";
import { createMonitor, type MonitorTarget } from "../lib/firecrawl";

// Setup 1x (roda manual pelo dashboard/CLI): cria os monitors do Firecrawl.
// - "WAF sources": portais que o Convex não alcança (DF/MA e cia) vigiados por crawl
// - "Web-wide": search target — a web inteira vira fonte de editais novos
// O webhook /webhooks/firecrawl faz o upsert em opportunities automaticamente.
export const setup = internalAction({
  handler: async () => {
    const siteUrl = process.env.CONVEX_SITE_URL ?? "https://keen-kangaroo-265.convex.site";
    const secret = process.env.FIRECRAWL_WEBHOOK_SECRET;
    if (!secret) throw new Error("FIRECRAWL_WEBHOOK_SECRET not set (convex env)");
    const webhookUrl = `${siteUrl}/webhooks/firecrawl`;

    const goal =
      "Novo edital, chamada pública, prêmio ou oportunidade cultural com inscrições abertas " +
      "ou prazo publicado/alterado — ignorar notícias e conteúdo editorial.";

    const wafTargets: MonitorTarget[] = [
      { type: "crawl", url: "https://mapas.cultura.df.gov.br" },
      { type: "crawl", url: "https://mapacultural.ma.gov.br" },
      { type: "crawl", url: "https://mapas.cultura.pe.gov.br" },
      { type: "crawl", url: "https://spcultura.prefeitura.sp.gov.br" },
    ];

    const results = [];
    results.push(await createMonitor({
      name: "Portais cultura fora do alcance",
      goal, webhookUrl, webhookSecret: secret,
      targets: wafTargets,
    }));
    results.push(await createMonitor({
      name: "Radar web — editais cultura Brasil",
      goal, webhookUrl, webhookSecret: secret,
      schedule: "every 12 hours",
      targets: [
        { type: "search", query: "edital cultura inscrições abertas 2026 site:gov.br OR site:mapasculturais" },
        { type: "search", query: "chamada pública música fomento edital inscrições abertas" },
      ],
    }));
    return { results };
  },
});
