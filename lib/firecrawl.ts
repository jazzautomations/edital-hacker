const BASE = "https://api.firecrawl.dev/v2";

function key(): string {
  const k = process.env.FIRECRAWL_API_KEY;
  if (!k) throw new Error("FIRECRAWL_API_KEY not set");
  return k;
}

/** Scrape síncrono de uma URL conhecida → markdown. */
export async function scrapeMarkdown(url: string): Promise<string> {
  const res = await fetch(`${BASE}/scrape`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: false }),
  });
  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`);
  const json = await res.json();
  const md = json?.data?.markdown;
  if (!md) throw new Error("Firecrawl returned no markdown");
  return md;
}

/** Busca web-wide + scrape dos top resultados → markdown consolidado (OSINT). */
export async function searchMarkdown(query: string, limit = 3): Promise<{ markdown: string; sources: string[] }> {
  const res = await fetch(`${BASE}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl search HTTP ${res.status}`);
  const json = await res.json();
  const items = json?.data ?? [];
  const sources: string[] = [];
  const parts: string[] = [];
  for (const it of Array.isArray(items) ? items : []) {
    if (it.url) sources.push(it.url);
    const md = it.markdown ?? it.description ?? "";
    if (md) parts.push(`### ${it.title ?? it.url}\n${String(md).slice(0, 4000)}`);
  }
  return { markdown: parts.join("\n\n").slice(0, 12000), sources };
}

export interface DiscoveredOpportunity {
  name: string;
  sourceUrl: string;
  registrationTo?: string;
  shortDescription?: string;
}

const DISCOVER_SCHEMA = {
  type: "object",
  properties: {
    opportunities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          sourceUrl: { type: "string", description: "URL oficial da página do edital" },
          registrationTo: { type: "string", description: "ISO date do fim das inscrições" },
          shortDescription: { type: "string" },
        },
        required: ["name", "sourceUrl"],
      },
    },
  },
  required: ["opportunities"],
};

/**
 * /v2/agent: descobre editais numa fonte sem depender de API ou de URL conhecida.
 * Usado para instâncias com WAF (DF, MA) e sites de prefeitura fora da rede Mapas.
 */
export async function discoverOpportunities(
  sourceName: string,
  baseUrl?: string,
  maxCredits = 50
): Promise<DiscoveredOpportunity[]> {
  const res = await fetch(`${BASE}/agent`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt:
        `Liste as oportunidades culturais (editais, prêmios, chamadas públicas) com inscrições abertas agora em "${sourceName}". ` +
        `Para cada uma, traga o nome, a URL oficial da página do edital, o prazo final de inscrição e uma descrição curta.`,
      urls: baseUrl ? [baseUrl] : undefined,
      location: { country: "BR" },
      schema: DISCOVER_SCHEMA,
      model: "spark-2",
      maxCredits,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl agent HTTP ${res.status}`);
  const json = await res.json();
  if (json?.status !== "completed" && !json?.data) {
    throw new Error(`Firecrawl agent status ${json?.status ?? "unknown"}`);
  }
  return json?.data?.opportunities ?? [];
}

export interface DiscoveredLead {
  name: string;
  type?: string;
  url?: string;
  contact?: string;
  description?: string;
}

const LEAD_SCHEMA = {
  type: "object",
  properties: {
    leads: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          type: { type: "string", description: "casa_de_show | festival | marca | escola | produtora | outro" },
          url: { type: "string", description: "site ou Instagram do lead" },
          contact: { type: "string", description: "email, telefone ou @instagram público de booking/contato" },
          description: { type: "string" },
        },
        required: ["name"],
      },
    },
  },
  required: ["leads"],
};

/**
 * Prospecção comercial: descobre leads reais (casas de show, festivais,
 * marcas, escolas, produtoras) que contratam trabalhadores da arte.
 */
export async function discoverLeads(
  leadType: string,
  niche: string,
  city: string,
  uf?: string,
  maxCredits = 40
): Promise<DiscoveredLead[]> {
  const res = await fetch(`${BASE}/agent`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt:
        `Encontre ${leadType} em ${city}${uf ? `/${uf}` : ""}, Brasil, que contratam ou poderiam contratar ${niche}. ` +
        `Para cada lead, traga nome, tipo, site ou Instagram, contato público de booking/comercial (email, telefone ou @usuario) e uma descrição curta do que é. ` +
        `Priorize lugares e organizações reais e ativas, com presença online verificável.`,
      location: { country: "BR" },
      schema: LEAD_SCHEMA,
      model: "spark-2",
      maxCredits,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl agent HTTP ${res.status}`);
  const json = await res.json();
  if (json?.status !== "completed" && !json?.data) {
    throw new Error(`Firecrawl agent status ${json?.status ?? "unknown"}`);
  }
  return json?.data?.leads ?? [];
}

export interface MonitorTarget {
  type: "scrape" | "crawl" | "search";
  urls?: string[];
  url?: string;
  query?: string;
}

/**
 * /v2/monitor — vigilância contínua. O radar deixa de ser "puxar fontes"
 * e vira "a web inteira avisa quando aparece edital novo".
 * Targets: scrape (URLs), crawl (site), search (resultados novos na web).
 * Notifica via webhook (monitor.page) só quando o goal LLM julga relevante.
 */
export async function createMonitor(opts: {
  name: string;
  goal: string;
  targets: MonitorTarget[];
  webhookUrl: string;
  webhookSecret: string;
  schedule?: string;
}): Promise<{ id?: string; status: number }> {
  const res = await fetch(`${BASE}/monitor`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      name: opts.name,
      goal: opts.goal,
      schedule: { text: opts.schedule ?? "every 6 hours", timezone: "America/Sao_Paulo" },
      targets: opts.targets,
      webhook: {
        url: opts.webhookUrl,
        headers: { "x-webhook-secret": opts.webhookSecret },
        events: ["monitor.page", "monitor.check.completed"],
      },
    }),
  });
  const json = await res.json().catch(() => ({}));
  return { id: json?.data?.id ?? json?.id, status: res.status };
}
