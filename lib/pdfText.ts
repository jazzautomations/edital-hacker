// As fontes padrão do PDF (Helvetica) só codificam WinAnsi. Qualquer caractere
// fora disso (≠, →, emoji no nome do artista…) fazia o pdf-lib lançar e a rota
// inteira devolver 500. Tudo que vai pro PDF passa por aqui antes.

const SWAP: Record<string, string> = {
  "\u2260": "não é", "\u2192": "->", "\u2190": "<-", "\u2197": "", "\u2713": "ok", "\u2714": "ok",
  "\u2717": "x", "\u2715": "x", "\u2264": "<=", "\u2265": ">=", "\u2212": "-", "\u2011": "-", "\u2010": "-",
  "\u00a0": " ", "\u2009": " ", "\u202f": " ", "\u2610": "[ ]", "\u2611": "[x]",
};
const WINANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

export function pdfSafe(input: unknown): string {
  let out = "";
  for (const ch of String(input ?? "").normalize("NFC")) {
    if (ch in SWAP) { out += SWAP[ch]; continue; }
    const code = ch.codePointAt(0)!;
    if (ch === "\n" || ch === "\t") { out += " "; continue; }
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WINANSI_EXTRA.includes(ch)) out += ch;
    // resto (emoji, símbolos raros, controle) é descartado
  }
  return out.replace(/ {2,}/g, " ");
}

/** 2026-12-20 → 20/12/2026 (documento brasileiro não leva data em ISO). */
export function dataBr(iso?: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso ?? "");
}
