// Cliente Nvoip API v3 — OAuth2 client_credentials.
// Docs: github.com/Nvoip/nvoip-api-examples · api.nvoip.com.br/v3
// Escopos por canal: sms:send, whatsapp:send, call:make.
// Endpoints de torpedo/WhatsApp conferidos contra os SDKs oficiais —
// revisar o path exato com o OpenAPI quando a credencial chegar.

const TOKEN_URL = "https://api.nvoip.com.br/auth/oauth2/token";
const BASE = "https://api.nvoip.com.br/v3";

let cached: { token: string; expiresAt: number } | null = null;

export function nvoipConfigured(): boolean {
  return !!(process.env.NVOIP_OAUTH_CLIENT_ID && process.env.NVOIP_OAUTH_CLIENT_SECRET);
}

async function token(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 30_000) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.NVOIP_OAUTH_CLIENT_ID!,
      client_secret: process.env.NVOIP_OAUTH_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Nvoip OAuth HTTP ${res.status}`);
  const json = await res.json();
  cached = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

/** SMS de texto livre — /v3/sms. Se a conta exigir template, usar NVOIP_SMS_TEMPLATE_ID. */
export async function sendSms(to: string, message: string) {
  const templateId = process.env.NVOIP_SMS_TEMPLATE_ID;
  if (templateId) {
    return post("/sms/sendTemplate", {
      idTemplate: templateId,
      destination: normalizePhone(to),
      parameters: [message],
    });
  }
  return post("/sms", { destination: normalizePhone(to), message, flash: false });
}

/** Torpedo de voz — o coach literalmente liga pro artista (TTS). */
export async function sendVoiceTorpedo(to: string, message: string) {
  return post("/torpedo/voice", {
    destination: normalizePhone(to),
    caller: process.env.NVOIP_CALLER ?? undefined,
    message,
    tts: true,
  });
}

/** WhatsApp oficial — exige instância WABA + template aprovado pela Meta. */
export async function sendWhatsAppTemplate(to: string, templateId: string, params: string[] = []) {
  return post("/wa/sendTemplates", {
    idTemplate: templateId,
    destination: normalizePhone(to),
    instance: process.env.NVOIP_WA_INSTANCE,
    language: "pt_BR",
    components: params.length
      ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }]
      : undefined,
  });
}

export async function sendOtp(phoneNumber: string) {
  return post("/otp", { phoneNumber: normalizePhone(phoneNumber), methods: { sms: true } });
}

export async function checkOtp(code: string, key: string) {
  const res = await fetch(
    `${BASE}/check/otp?code=${encodeURIComponent(code)}&key=${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${await token()}` } }
  );
  return { ok: res.ok, status: res.status };
}

export async function getBalance() {
  const res = await fetch(`${BASE}/balance`, {
    headers: { Authorization: `Bearer ${await token()}` },
  });
  return { ok: res.ok, status: res.status, body: await res.text() };
}
