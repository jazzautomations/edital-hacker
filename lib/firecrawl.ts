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
