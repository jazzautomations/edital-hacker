const FROM = () =>
  process.env.RESEND_FROM ?? "Manager <manager@seu-dominio.com>";

function key(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

export interface EmailItem {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const k = key();
  if (!k) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM(), to, subject, html }),
  });
  return { ok: res.ok, status: res.status };
}

/** Batch: até 100 emails/chamada, Idempotency-Key evita duplicata em retry. */
export async function sendBatch(items: EmailItem[], idempotencyKey?: string) {
  const k = key();
  if (!k) return { skipped: true };
  if (items.length === 0) return { ok: true, sent: 0 };
  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${k}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(items.map((i) => ({ from: FROM(), ...i }))),
  });
  return { ok: res.ok, status: res.status, sent: items.length };
}
