// Camada de notificação multi-canal do coach.
// WhatsApp demo: Evolution API (instância já no ar — texto livre, sem Meta).
// Produção/WhatsApp oficial + SMS + voz: Nvoip. O canal é plugável por env var.
import { sendSms, sendVoiceTorpedo, sendWhatsAppTemplate, nvoipConfigured } from "./nvoip";

const EVOLUTION_URL = () => process.env.EVOLUTION_API_URL;
const EVOLUTION_KEY = () => process.env.EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE = () => process.env.EVOLUTION_INSTANCE ?? "jazz";

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** WhatsApp via Evolution — texto livre, zero aprovação. Só roda onde a tailnet alcança. */
export async function sendWhatsAppEvolution(to: string, text: string) {
  const url = EVOLUTION_URL();
  const key = EVOLUTION_KEY();
  if (!url || !key) return { skipped: true };
  const res = await fetch(
    `${url.replace(/\/$/, "")}/message/sendText/${EVOLUTION_INSTANCE()}`,
    {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json" },
      body: JSON.stringify({ number: normalizePhone(to), text }),
    }
  );
  return { ok: res.ok, status: res.status };
}

export type Channel = "whatsapp" | "sms" | "voice";

/**
 * Dispara a mensagem do coach pelo melhor canal disponível.
 * Preferência demo: Evolution WhatsApp → Nvoip SMS → torpedo de voz se urgente.
 */
export async function notifyCoach(
  phone: string,
  text: string,
  opts: { urgent?: boolean; channel?: Channel } = {}
): Promise<{ channel: Channel | "none"; result: unknown }> {
  const pref = opts.channel;
  if (pref === "whatsapp" || !pref) {
    const wa = process.env.NVOIP_WA_TEMPLATE_ID && nvoipConfigured()
      ? await sendWhatsAppTemplate(phone, process.env.NVOIP_WA_TEMPLATE_ID!, [text])
      : await sendWhatsAppEvolution(phone, text);
    if ("ok" in wa ? wa.ok : !wa.skipped) return { channel: "whatsapp", result: wa };
  }
  if ((pref === "sms" || !pref) && nvoipConfigured()) {
    const sms = await sendSms(phone, text);
    if (sms.ok) return { channel: "sms", result: sms };
    if (opts.urgent) {
      const voice = await sendVoiceTorpedo(phone, text);
      if (voice.ok) return { channel: "voice", result: voice };
    }
  }
  return { channel: "none", result: null };
}
