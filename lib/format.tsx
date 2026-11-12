import Link from "next/link";
import { Fragment, type ReactNode } from "react";

// Siglas que continuam em caixa alta quando um título em CAIXA ALTA é normalizado.
const KEEP = new Set([
  "PNAB", "PNCP", "MINC", "ECAD", "MEI", "CNPJ", "CPF", "LGBTQIA+", "PCD", "TV", "DJ", "MPB",
  "SESC", "SENAC", "FUNARTE", "PROAC", "LIC", "II", "III", "IV", "VI", "VII", "VIII", "IX", "XI", "XII",
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR",
  "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

const SMALL = new Set(["a", "à", "ao", "aos", "as", "às", "o", "os", "e", "é", "de", "da", "das", "do", "dos", "em", "na", "nas", "no", "nos", "para", "pra", "por", "pela", "pelo", "com", "sem", "ou", "um", "uma", "nº", "n°"]);

function fixWord(w: string, first: boolean): string {
  // trata compostos com hífen (Barbalha-CE, Pré-Produção)
  if (w.includes("-") && w.length > 1) {
    return w.split("-").map((part, i) => fixWord(part, first && i === 0)).join("-");
  }
  const bare = w.replace(/[^A-Za-zÀ-ÿ+]/g, "");
  if (bare && KEEP.has(bare.toUpperCase()) && bare === bare.toUpperCase()) return w;
  const lw = w.toLocaleLowerCase("pt-BR");
  if (!first && SMALL.has(bare.toLocaleLowerCase("pt-BR"))) return lw;
  return lw.replace(/[a-zà-ÿ]/, (c) => c.toLocaleUpperCase("pt-BR"));
}

/** Edital vem do portal em CAIXA ALTA gritando — vira Título Legível. */
export function tidyTitle(raw: string): string {
  const t = raw.trim().replace(/\s+/g, " ").replace(/[.\s]+$/, "");
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, "");
  const upper = letters.replace(/[^A-ZÀ-Þ]/g, "").length;
  if (letters.length < 8 || upper / letters.length < 0.7) return t;
  let first = true;
  return t
    .split(" ")
    .map((w) => {
      const out = fixWord(w, first);
      first = /[–—:]$/.test(w) || w === "–" || w === "—";
      return out;
    })
    .join(" ");
}

/** Markdown mínimo do LLM: **negrito**, `código` e rotas do app viram links. */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|`([^`]+)`|(?<![\w/])(\/(?:agenda|prospeccao|pipeline|coach|rider|prestacao|oportunidades|assinatura|epk))\b/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    if (m[1] !== undefined) {
      out.push(<RichInline key={k++} text={m[1]} bold />);
    } else {
      const route = m[3] ?? (m[2]?.match(/^\/[a-z]+$/) ? m[2] : null);
      if (route) {
        out.push(
          <Link key={k++} href={route} className="font-medium text-emerald-300 underline decoration-emerald-500/40 underline-offset-2 hover:decoration-emerald-300">
            {ROUTE_LABEL[route] ?? route.slice(1)}
          </Link>
        );
      } else {
        out.push(
          <code key={k++} className="rounded bg-neutral-800 px-1 py-0.5 font-mono text-[0.85em]">
            {m[2]}
          </code>
        );
      }
    }
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}

const ROUTE_LABEL: Record<string, string> = {
  "/prospeccao": "prospecção",
  "/prestacao": "prestação",
  "/oportunidades": "radar",
};

function RichInline({ text, bold }: { text: string; bold?: boolean }) {
  return bold ? <strong className="font-semibold text-neutral-50"><RichText text={text} /></strong> : <RichText text={text} />;
}
