import { personTypeMatches, type Opportunity, type Profile } from "@/lib/types";
import { tidyTitle } from "@/lib/format";

// Como um edital aparece pro artista. Fontes diferentes chegam em formatos
// diferentes; aqui vira um cartão só: título que diz do que se trata, quem
// publica, de onde é.

const UF_BY_SOURCE: [RegExp, string][] = [
  [/cear[áa]/i, "CE"], [/\bES\b|esp[íi]rito santo/i, "ES"], [/goi[âa]nia|goi[áa]s/i, "GO"],
  [/santo andr[ée]|spcultura|s[ãa]o paulo/i, "SP"], [/parauapebas|par[áa]\b/i, "PA"], [/\bDF\b|distrito federal/i, "DF"],
  [/maranh[ãa]o/i, "MA"], [/pernambuco/i, "PE"], [/\bMT\b|mato grosso/i, "MT"], [/sergipe/i, "SE"], [/\bBH\b|belo horizonte|minas/i, "MG"],
];

export interface OppView {
  title: string;
  publisher: string;
  uf: string | null;
  summary: string;
  isPublicPurchase: boolean;
}

const sentenceCase = (s: string) => {
  const t = s.trim();
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
  if (letters.length < 12 || upper / letters.length < 0.7) return t;
  const low = t.toLocaleLowerCase("pt-BR");
  return low.replace(/(^|[.!?]\s+)([a-zà-ÿ])/g, (_m, p, c) => p + c.toLocaleUpperCase("pt-BR"));
};

export function viewOf(o: Opportunity): OppView {
  if (o.source === "pncp") {
    // shortDescription = "ORGAO — Município/UF. descrição do objeto"
    const m = /^(.*?)\s+—\s+(.*?)\/([A-Z]{2})\.\s*([\s\S]*)$/.exec(o.shortDescription ?? "");
    if (m) {
      const [, orgao, municipio, uf, objeto] = m;
      const obj = sentenceCase(objeto.replace(/\s+/g, " ")).replace(/^(objeto|credenciamento|chamamento p[úu]blico)\s*[:\-–]\s*/i, "");
      const head = obj.split(/(?<=[.;])\s/)[0] ?? obj;
      return {
        title: head.length > 12 ? (head.length > 130 ? head.slice(0, 127).trimEnd() + "…" : head.replace(/[.;]$/, "")) : tidyTitle(o.name),
        publisher: `${tidyTitle(orgao)} · ${municipio}/${uf}`,
        uf,
        summary: `${tidyTitle(o.name)}. ${obj}`,
        isPublicPurchase: true,
      };
    }
  }
  const uf = UF_BY_SOURCE.find(([re]) => re.test(o.sourceName))?.[1] ?? null;
  return {
    title: tidyTitle(o.name),
    publisher: o.ownerName ? `${o.ownerName} · ${o.sourceName}` : o.sourceName,
    uf,
    summary: sentenceCase((o.enriched?.summary ?? o.shortDescription ?? "").replace(/\s+/g, " ")),
    isPublicPurchase: false,
  };
}

// ───────── adequação ao perfil ─────────
// O que o artista respondeu no onboarding (área, estado, como se inscreve)
// decide a ordem do radar. Cada motivo aparece no cartão: nada de "confia".


const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** termos que denunciam cada área no texto de um edital */
export const AREA_TERMS: Record<string, string[]> = {
  "música": ["music", "musica", "banda", "cantor", "instrument", "show", "orquestra", "coral", "fonogra", "compositor"],
  "teatro": ["teatro", "teatral", "cenic", "dramaturg", "espetaculo"],
  "dança": ["danca", "coreograf", "bale"],
  "audiovisual": ["audiovisual", "cinema", "filme", "curta", "video", "documentario", "roteiro"],
  "artes visuais": ["artes visuais", "arte visual", "exposic", "pintura", "fotograf", "grafite", "escultura", "artes plasticas"],
  "literatura": ["literatur", "livro", "leitura", "escritor", "poesia", "editora", "publicac"],
  "circo": ["circo", "circense", "palhac"],
  "cultura popular": ["cultura popular", "mestre", "folclor", "tradicion", "quilomb", "capoeira", "junin", "matriz african", "indigena", "patrimonio"],
  "produção cultural": ["producao cultural", "produtor", "gestao cultural", "festival", "evento"],
  "técnica de palco": ["tecnic", "iluminac", "sonoriz", "cenotecn"],
  "ensino de arte": ["oficina", "formacao", "curso", "aula", "educa", "capacitac"],
  "dj": ["dj", "eletronic", "discotec"],
};

export const AREA_OPTIONS = Object.keys(AREA_TERMS);

export function areasOf(o: Opportunity, v: OppView): string[] {
  const text = fold(`${v.title} ${v.summary} ${o.categories.join(" ")} ${o.name}`);
  return AREA_OPTIONS.filter((a) => AREA_TERMS[a].some((t) => text.includes(t)));
}

function termsFor(area: string): string[] {
  const k = fold(area);
  const known = Object.entries(AREA_TERMS).find(([name]) => fold(name) === k);
  return known ? known[1] : [k];
}

/** MEI fica em maiúscula; o resto em minúscula no meio da frase */
export const tipo = (personType: string) => (personType === "MEI" ? "MEI" : personType.toLowerCase());

/** Valor de fomento plausível. Abaixo de R$ 500 é taxa, erro de digitação ou anúncio. */
export const valorConfiavel = (o: Opportunity): number | null =>
  o.totalResource && o.totalResource >= 500 ? o.totalResource : null;

/** Prazo plausível em dias; fontes abertas trazem datas como o ano 2111. */
export const prazoConfiavel = (dias: number | null): number | null => (dias !== null && dias <= 365 ? dias : null);

export interface Fit {
  score: number;
  reasons: { text: string; tone: "good" | "bad" | "neutral" }[];
  /** áreas do perfil que bateram */
  areas: string[];
}

export function fitOf(o: Opportunity, v: OppView, profile: Profile | null | undefined, dias: number | null): Fit {
  const fit: Fit = { score: 0, reasons: [], areas: [] };
  if (!profile) return fit;
  const text = fold(`${v.title} ${v.summary} ${o.categories.join(" ")} ${o.name}`);

  const mine = profile.artAreas ?? [];
  for (const area of mine) {
    if (termsFor(area).some((t) => text.includes(t))) fit.areas.push(area);
  }
  if (fit.areas.length) {
    // a primeira área do perfil é a principal: pesa o dobro das outras
    fit.score += (fit.areas.includes(mine[0]) ? 40 : 20) + Math.min(15, (fit.areas.length - 1) * 8);
    fit.reasons.push({ text: `tua área: ${fit.areas.slice(0, 2).join(", ").toLowerCase()}`, tone: "good" });
  }

  if (profile.uf) {
    if (v.uf === profile.uf) {
      fit.score += 30;
      fit.reasons.push({ text: `no teu estado (${profile.uf})`, tone: "good" });
    } else if (v.uf === null) {
      fit.score += 10; // nacional: qualquer estado concorre
    } else {
      fit.score -= 30; // edital estadual/municipal costuma exigir residência
      fit.reasons.push({ text: `é de ${v.uf}: costuma exigir morar lá`, tone: "neutral" });
    }
  }

  if (o.proponentTypes.length > 0) {
    if (personTypeMatches(profile.personType, o.proponentTypes)) {
      fit.score += 15;
      fit.reasons.push({ text: `aceita ${tipo(profile.personType)}`, tone: "good" });
    } else {
      fit.score -= 45;
      fit.reasons.push({ text: `pode não aceitar ${tipo(profile.personType)}`, tone: "bad" });
    }
  }

  if (dias !== null) {
    if (dias <= 1) fit.score -= 12; // fecha hoje/amanhã: quase não dá tempo
    else if (dias <= 45) fit.score += 6;
    else if (dias > 365) fit.score -= 15; // prazo absurdo = cadastro malfeito na fonte
  }
  const valor = valorConfiavel(o);
  if (valor) fit.score += 3;
  else if (o.totalResource) fit.score -= 10; // "R$ 97" não é fomento
  if (o.enriched) fit.score += 2;
  return fit;
}
