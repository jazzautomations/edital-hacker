import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { jsonChat, llmConfigured } from "@/lib/llm";

// Webhook Composio — trigger GMAIL_NEW_GMAIL_MESSAGE (polling 2min) entrega
// o email novo aqui quase em tempo real. Reply-detect deixa de ser cron:
// contratante respondeu → pendingAction na hora. Setup:
//   POST /api/v3/webhook_subscriptions {webhook_url, enabled_events:["composio.trigger.message"]}
//   → guardar o secret retornado em COMPOSIO_WEBHOOK_SECRET.

const INTENT_TO_STAGE: Record<string, string> = {
  interessado: "respondeu",
  negociando: "negociando",
  confirmado: "fechado",
  recusou: "perdido",
};

function verifySignature(req: Request, raw: string): boolean {
  const secret = process.env.COMPOSIO_WEBHOOK_SECRET;
  if (!secret) return true; // sem secret configurado, aceita (hackathon)
  const id = req.headers.get("webhook-id") ?? "";
  const ts = req.headers.get("webhook-timestamp") ?? "";
  const sig = req.headers.get("webhook-signature") ?? "";
  const expected = createHmac("sha256", secret).update(`${id}.${ts}.${raw}`).digest("base64");
  return sig.split(" ").some((s) => s.replace(/^v1,/, "") === expected);
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(req, raw)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  const evt = JSON.parse(raw);
  const meta = evt?.metadata ?? {};
  const data = evt?.data ?? {};
  if (meta.trigger_slug !== "GMAIL_NEW_GMAIL_MESSAGE") return NextResponse.json({ ok: true, skipped: "other trigger" });
  if (!llmConfigured()) return NextResponse.json({ ok: true, skipped: "no llm" });

  const userId = meta.user_id as string; // = email do perfil
  const sender = String(data.sender ?? "");
  const senderEmail = (sender.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? sender).toLowerCase();

  // anti-loop: email enviado pelo próprio artista dispara o trigger também
  if (senderEmail === userId.toLowerCase()) return NextResponse.json({ ok: true, skipped: "own email" });

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.getByEmail, { email: userId })) as any;
  if (!profile) return NextResponse.json({ ok: true, skipped: "unknown user" });

  const leads = (await convex.query(api.leads.listForProfile, { profileId: profile._id })) as any[];
  const lead = leads.find(
    (l) =>
      !["fechado", "perdido"].includes(l.status) &&
      ((l.contact && l.contact.toLowerCase().includes(senderEmail)) ||
        sender.toLowerCase().includes(l.name.toLowerCase().slice(0, 12)))
  );
  if (!lead) return NextResponse.json({ ok: true, skipped: "no lead match" });

  const cls = await jsonChat<{ intent: string; confidence?: number; summary?: string }>(
    `Você classifica respostas de emails comerciais recebidos por um artista brasileiro.
Responda SÓ JSON: {"intent":"interessado|negociando|confirmado|recusou|neutro","confidence":0-100,"summary":"1 frase"}`,
    `De: ${sender}\nAssunto: ${data.subject ?? ""}\n${String(data.message_text ?? "").slice(0, 1500)}`
  );

  const stage = INTENT_TO_STAGE[cls?.intent ?? ""];
  if (!stage || (cls.confidence ?? 0) < 55) {
    return NextResponse.json({ ok: true, classified: cls?.intent ?? "neutro" });
  }

  await convex.mutation(api.pendingActions.propose, {
    profileId: profile._id,
    type: "move_lead_stage",
    label: `${lead.name} respondeu — ${cls.intent} → mover pra "${stage}"?`,
    description: `${cls.summary ?? data.subject ?? ""} · de ${senderEmail}`,
    payload: { leadId: lead._id, stage, intent: cls.intent },
  });

  return NextResponse.json({ ok: true, proposed: { lead: lead.name, intent: cls.intent, stage } });
}
