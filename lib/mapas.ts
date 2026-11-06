export const MAPAS_SOURCES: { name: string; baseUrl: string; scope: "federal" | "estadual" | "municipal" }[] = [
  { name: "Mapa da Cultura (MinC)", baseUrl: "https://mapa.cultura.gov.br", scope: "federal" },
  { name: "Mapa Cultural do Ceará", baseUrl: "https://mapacultural.secult.ce.gov.br", scope: "estadual" },
  { name: "Mapa Cultural do DF", baseUrl: "http://mapa.cultura.df.gov.br", scope: "estadual" },
  { name: "Mapa Cultural do ES", baseUrl: "https://mapa.cultura.es.gov.br", scope: "estadual" },
  { name: "Mapagoiano", baseUrl: "https://mapagoiano.cultura.go.gov.br", scope: "estadual" },
  { name: "Mapa Cultural de Pernambuco", baseUrl: "https://www.mapacultural.pe.gov.br", scope: "estadual" },
  { name: "Mapa Cultural do Maranhão", baseUrl: "http://ma.mapas.cultura.gov.br", scope: "estadual" },
  { name: "Mapa Cultural de MT", baseUrl: "https://mapas.mt.gov.br", scope: "estadual" },
  { name: "Mapa Cultural de MS", baseUrl: "https://www.mapacultural.ms.gov.br", scope: "estadual" },
  { name: "Mapa Cultural do Pará", baseUrl: "https://mapacultural.pa.gov.br", scope: "estadual" },
  { name: "Mapas de Sergipe", baseUrl: "https://mapacultural.se.gov.br", scope: "estadual" },
  { name: "SPCultura", baseUrl: "https://spcultura.prefeitura.sp.gov.br", scope: "municipal" },
];

export interface MapasDate {
  date: string;
  timezone?: string;
}

export interface MapasOpportunity {
  id: number;
  name: string;
  shortDescription?: string;
  longDescription?: string;
  registrationFrom?: MapasDate;
  registrationTo?: MapasDate;
  registrationProponentTypes?: string[] | string;
  registrationCategories?: string[] | string;
  registrationRanges?: string[] | string;
  registrationLimitPerOwner?: number | string;
  totalResource?: number | string;
  vacancies?: number;
  site?: string;
  status?: number;
  updateTimestamp?: MapasDate;
  owner?: { id: number; name: string };
  parent?: { id: number; name: string };
}

const SELECT = [
  "id",
  "name",
  "shortDescription",
  "registrationFrom",
  "registrationTo",
  "registrationProponentTypes",
  "registrationCategories",
  "registrationLimitPerOwner",
  "totalResource",
  "vacancies",
  "site",
  "updateTimestamp",
  "owner.{id,name}",
].join(",");

export function opportunityUrl(baseUrl: string, id: number): string {
  return `${baseUrl}/oportunidade/${id}/`;
}

export async function fetchOpenOpportunities(
  source: { baseUrl: string },
  limit = 200
): Promise<MapasOpportunity[]> {
  const url =
    `${source.baseUrl}/api/opportunity/find` +
    `?@select=${SELECT}` +
    `&@limit=${limit}` +
    `&status=EQ(1)` +
    `&registrationTo=GTE(now())` +
    `&@order=${encodeURIComponent("registrationTo ASC")}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "edital-hacker/0.1 (+hackbrasil)" },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Mapas ${source.baseUrl}: HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function toIso(d?: MapasDate): string | undefined {
  if (!d?.date) return undefined;
  return d.date.replace(" ", "T") + "-03:00";
}

export function toStrArray(v?: string[] | string): string[] {
  if (Array.isArray(v)) return v;
  return v ? [v] : [];
}

export function toNum(v?: number | string): number | undefined {
  const n = Number(v);
  return v === undefined || v === null || isNaN(n) ? undefined : n;
}
