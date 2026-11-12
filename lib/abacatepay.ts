const BASE = "https://api.abacatepay.com/v2";

function key(): string {
  const k = process.env.ABACATEPAY_API_KEY;
  if (!k) throw new Error("ABACATEPAY_API_KEY not set");
  return k;
}

const devMode = () => process.env.ABACATEPAY_SANDBOX !== "false";

async function post(path: string, body: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(`AbacatePay ${path}: HTTP ${res.status} ${json?.error ?? ""}`);
  }
  return json.data;
}

export interface CheckoutResult {
  id: string;
  url: string;
  status: string;
}

/** Checkout de assinatura (produto com cycle na loja) → url p/ redirecionar. */
export async function createSubscriptionCheckout(args: {
  productId: string;
  externalId: string; // nosso profileId — reconcilia no webhook
  returnUrl: string;
  completionUrl: string;
  methods?: ("PIX" | "CARD")[];
}): Promise<CheckoutResult> {
  const body = (methods: ("PIX" | "CARD")[]) => ({
    items: [{ id: args.productId, quantity: 1 }],
    externalId: args.externalId,
    returnUrl: args.returnUrl,
    completionUrl: args.completionUrl,
    methods,
    retryPolicy: { maxRetry: 5, retryEvery: 3 },
    devMode: devMode(),
  });
  const wanted = args.methods ?? ["PIX", "CARD"];
  try {
    return await post("/subscriptions/create", body(wanted));
  } catch (e) {
    // PIX recorrente exige "PIX Automático" habilitado na loja — cai pra cartão
    if (wanted.includes("PIX") && /PIX Autom/i.test(String(e))) {
      return await post("/subscriptions/create", body(["CARD"]));
    }
    throw e;
  }
}

/** Checkout avulso (destrava 1 edital) → url p/ redirecionar. */
export async function createOneOffCheckout(args: {
  productId: string; // produto "Destrava Edital" sem cycle
  externalId: string; // `unlock:{profileId}:{opportunityId}`
  returnUrl: string;
  completionUrl: string;
}): Promise<CheckoutResult> {
  return await post("/checkouts/create", {
    items: [{ id: args.productId, quantity: 1 }],
    externalId: args.externalId,
    returnUrl: args.returnUrl,
    completionUrl: args.completionUrl,
    methods: ["PIX", "CARD"],
    devMode: devMode(),
  });
}

export interface PixQrResult {
  id: string;
  brCode: string; // copia-e-cola
  brCodeBase64: string; // QR inline (data URI ou base64 puro)
  status: string;
  expiresIn?: number;
}

/** A API recusa qualquer caractere fora do ASCII básico na descrição (ex.: "—"). */
function asciiDescription(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[^\x20-\x7e]/g, "")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, 37);
}

/** CPF/CNPJ: só dígitos, com dígitos verificadores conferidos (CPF). */
export function validTaxId(raw: string): string | null {
  const d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 14) return d;
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return null;
  const dv = (n: number) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += Number(d[i]) * (n + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]) ? d : null;
}

/** PIX direto: QR inline no paywall — o pagador escaneia na tela, sem redirect. */
export async function createPixQr(args: {
  amount: number; // centavos
  description: string; // <= 37 chars, ASCII
  customer: { name: string; email: string; taxId: string; cellphone?: string };
}): Promise<PixQrResult> {
  return await post("/transparents/create", {
    method: "PIX",
    data: {
      name: args.customer.name,
      email: args.customer.email,
      taxId: args.customer.taxId,
      cellphone: args.customer.cellphone ?? "11900000000",
      amount: args.amount,
      description: asciiDescription(args.description),
    },
  });
}

async function get(path: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${key()}` } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.success === false) {
    throw new Error(`AbacatePay ${path}: HTTP ${res.status} ${json?.error ?? ""}`);
  }
  return json.data;
}

/** Status de uma cobrança Pix inline: PENDING | PAID | EXPIRED | CANCELLED… */
export async function checkPix(id: string): Promise<{ status: string }> {
  return await get(`/transparents/check?id=${encodeURIComponent(id)}`);
}

/** Só no sandbox: marca a cobrança como paga (pra testar o ciclo sem dinheiro). */
export async function simulatePixPayment(id: string): Promise<{ status: string }> {
  if (!devMode()) throw new Error("simulação só existe no sandbox");
  return await post(`/transparents/simulate-payment?id=${encodeURIComponent(id)}`, { metadata: {} });
}

export const isSandbox = devMode;

/** Verificação do segredo do webhook (configurado no painel Abacate). */
export function verifyWebhookSecret(provided: string | null): boolean {
  const expected = process.env.ABACATEPAY_WEBHOOK_SECRET;
  if (!expected) return false;
  return provided === expected;
}
