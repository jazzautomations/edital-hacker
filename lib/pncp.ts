// PNCP — Portal Nacional de Contratações Públicas.
// API pública sem auth (exige User-Agent de navegador — WAF dropa sem).
// Dois usos: (a) editais/credenciamentos ABERTOS vira oportunidade;
// (b) contratos de inexigibilidade (art. 74 II — artista consagrado) têm
// cachê itemizado = benchmark de preço por artista × município.
// Verificado ao vivo 10/nov/2026: /api/search e /api/consulta operacionais.

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

export interface PncpItem {
  title?: string;
  description?: string;
  item_url?: string;
  document_type?: string;
  orgao_nome?: string;
  municipio_nome?: string;
  codigo_ibge?: string;
  uf?: string;
  valor_global?: number;
  data_assinatura?: string;
  data_publicacao_pncp?: string;
  data_fim_vigencia?: string;
  numero_controle_pncp?: string;
  fornecedor_nome?: string;
  fornecedor_ni?: string;
  modalidade_licitacao_nome?: string;
  situacao_nome?: string;
}

export async function searchPncp(opts: {
  q: string;
  tipos?: string; // "edital" | "contrato" | "ata" | "edital,contrato"...
  status?: string; // "recebendo_proposta" | "analise" | "encerrado"
  uf?: string;
  pagina?: number;
  tam?: number;
}): Promise<{ total: number; items: PncpItem[] }> {
  const params = new URLSearchParams({
    q: opts.q,
    pagina: String(opts.pagina ?? 1),
    tam_pagina: String(opts.tam ?? 50),
    ordenacao: "-data",
  });
  if (opts.tipos) params.set("tipos_documento", opts.tipos);
  if (opts.status) params.set("status", opts.status);
  if (opts.uf) params.set("uf", opts.uf);
  const res = await fetch(`https://pncp.gov.br/api/search/?${params}`, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`PNCP search HTTP ${res.status}`);
  const json = await res.json();
  return { total: json?.total ?? 0, items: json?.items ?? [] };
}

export function pncpUrl(item: PncpItem): string | undefined {
  return item.item_url ? `https://pncp.gov.br/app${item.item_url}` : undefined;
}

// Palavras que marcam contratação artística de verdade (evita show de slides,
// showroom, "show" figurado, kit de palco sem artista etc).
const ART_RE =
  /\b(show|artista|art[íi]stic|banda|cantor|cantora|dj\b|m[úu]sico|apresenta[çc][ãa]o (art|musical|cultural)|atra[çc][ãa]o art|palco|festa (de|da|do) (padroeir|emancipa|anivers)|credenciamento de (artistas|djs|m[úu]sicos))/i;

export function isArtistic(text: string): boolean {
  return ART_RE.test(text);
}

// Extrai o nome do artista de descrições tipo:
// "SHOW MUSICAL DO ARTISTA ZÉ CANTOR", "APRESENTAÇÃO DA BANDA X",
// "CONTRATAÇÃO DO ARTISTA Y", "SHOW DE X"
export function extractArtist(desc?: string): string | undefined {
  if (!desc) return undefined;
  const patterns = [
    /\b(?:artista|banda|cantora?|dupla|dj)\s+(?:exclusiv[ao]\s+)?["'«]?([A-ZÀ-Ú][A-ZÀ-Üa-zà-ú'&.\s-]{2,50}?)["'»]?\s*(?:,|\.| para | para\s| na | no | com |\||$)/i,
    /\bshow\s+(?:d[aeo]|musical d[aeo]|com)\s+["'«]?([A-ZÀ-Ú][A-ZÀ-Üa-zà-ú'&.\s-]{2,50}?)["'»]?\s*(?:,|\.| para | na | no | com |\||$)/i,
    /\b(?:apresenta[çc][ãa]o|atra[çc][ãa]o)\s+(?:musical\s+)?(?:d[aeo]|com)\s+(?:artista\s+|banda\s+)?["'«]?([A-ZÀ-Ú][A-ZÀ-Üa-zà-ú'&.\s-]{2,50}?)["'»]?\s*(?:,|\.| para | na | no | com |\||$)/i,
  ];
  for (const re of patterns) {
    const m = desc.match(re);
    if (m?.[1]) {
      const name = m[1].trim().replace(/\s{2,}/g, " ");
      if (name.length >= 3 && !/municipal|prefeitura|secretaria|festa|evento|natal|réveillon|reveillon/i.test(name))
        return name;
    }
  }
  return undefined;
}
