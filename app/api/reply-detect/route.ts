import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { composioConfigured, fetchInbox, gmailStatus } from "@/lib/composio";
import { jsonChat, llmConfigured } from "@/lib/llm";

// O loop matador (padrão do 360AA): lê o inbox do artista, casa remetentes
// com leads do funil, classifica a resposta por intenção e move o estágio.
// Roda sob demanda (botão/coach) e via cron Convex → /api/reply-detect.

const INTENT_TO_STAGE: Record<string, string> = {
  interessado: "respondeu",
  negociando: "negociando",
  confirmado: "fechado",
  recusou: "perdido",
};

const CLASSIFY_SYSTEM = `Você classifica respostas de emails comerciais recebidos por um artista brasileiro.
Para cada email, diga a intenção do remetente: "interessado" (respondeu querendo conversar/pediu info), "negociando" (falando de valores/condições/data), "confirmado" (fechou/data acertada), "recusou" (disse não/sem interesse), ou "neutro" (newsletter, automático, nada a ver).
Responda SÓ JSON: {"emails": [{"index": N, "intent": "...", "confidence": 0-100, "summary": "1 frase curta"}]}`;

export async function POST(req: Request) {
  const secret = req.headers.get("x-notify-secret");
  const { email } = (await req.json()) as { email: string };
  // chamado pela UI (sem secret → exige email) e pelo cron Convex (com secret)
  if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!composioConfigured()) return NextResponse.json({ configured: false, moved: [] });
  if (!llmConfigured()) return NextResponse.json({ error: "LLM_API_KEY not configured" }, { status: 503 });

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.getByEmail, { email, secret: process.env.NOTIFY_SECRET ?? "" })) as any;
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  const st = await gmailStatus(email);
  if (!st.connected) return NextResponse.json({ configured: true, connected: false, moved: [] });

  const leads = (await convex.query(api.leads.listForProfile, { profileId: profile._id })) as any[];
  const openLeads = leads.filter((l) => !["fechado", "perdido"].includes(l.status));
  if (!openLeads.length) return NextResponse.json({ connected: true, moved: [], checked: 0 });

  const inbox = await fetchInbox(email, "in:inbox newer_than:14d -category:promotions -category:social", 25);
  if (!inbox.length) return NextResponse.json({ connected: true, moved: [], checked: 0 });

  // casa remetente ↔ lead (por email ou fragmento de nome)
  const hits = inbox
    .map((msg, i) => {
      const lead = openLeads.find(
        (l) =>
          (l.contact && l.contact.toLowerCase().includes(msg.fromEmail)) ||
          msg.from.toLowerCase().includes(l.name.toLowerCase().slice(0, 12))
      );
      return lead ? { msg, lead, index: i } : null;
    })
    .filter(Boolean) as { msg: any; lead: any; index: number }[];

  if (!hits.length) return NextResponse.json({ connected: true, moved: [], checked: inbox.length });

  const classify = await jsonChat<{ emails: { index: number; intent: string; confidence?: number; summary?: string }[] }>(
    CLASSIFY_SYSTEM,
    hits
      .map((h, i) => `[${i}] de: ${h.msg.from} | lead: ${h.lead.name}\nassunto: ${h.msg.subject}\n${h.msg.snippet}`)
      .join("\n\n---\n\n")
  );

  // O agente propõe, o humano decide: grava pendingAction (confiança ≥55),
  // artista confirma em /prospeccao — nenhum stage move sem clique.
  const proposals: { lead: string; intent: string; summary?: string }[] = [];
  for (const c of classify?.emails ?? []) {
    const hit = hits[c.index];
    const stage = INTENT_TO_STAGE[c.intent];
    if (!hit || !stage || (c.confidence ?? 0) < 55) continue;
    await convex.mutation(api.pendingActions.propose, {
      profileId: profile._id,
      type: "move_lead_stage",
      label: `${hit.lead.name} respondeu — ${c.intent} → mover pra "${stage}"?`,
      description: `${c.summary ?? hit.msg.subject} · de ${hit.msg.fromEmail}`,
      payload: { leadId: hit.lead._id, stage, intent: c.intent },
    });
    proposals.push({ lead: hit.lead.name, intent: c.intent, summary: c.summary });
  }

  return NextResponse.json({ connected: true, checked: inbox.length, proposals });
}
