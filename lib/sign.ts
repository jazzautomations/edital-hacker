import { createHmac, timingSafeEqual } from "node:crypto";

// Assinatura das URLs que serviços externos (agente de voz da Agora) chamam de
// volta. Sem isso, qualquer um que soubesse um e-mail executava tools do coach
// no perfil alheio. A chave nunca sai do servidor.
function key(): string {
  return (
    process.env.VOICE_LLM_API_KEY ||
    process.env.AGORA_CUSTOMER_SECRET ||
    process.env.WORKOS_COOKIE_PASSWORD ||
    ""
  );
}

export function signParts(...parts: string[]): string {
  const k = key();
  if (!k) return "";
  return createHmac("sha256", k).update(parts.join("\n")).digest("hex").slice(0, 40);
}

export function verifyParts(sig: string | null, ...parts: string[]): boolean {
  const expected = signParts(...parts);
  if (!expected || !sig || sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
