import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { chat, llmConfigured } from "@/lib/llm";

const COACH_SYSTEM = `Você é o Manager — o coach de IA do trabalhador da arte (músicos, DJs, produtores, professores de arte).

Filosofia: preparar, não fazer pelo artista. Você organiza a carreira dele como um empresário faria — mas ele decide.
Vocabulário B.R.A.V.O.: Base (materiais, docs), Repertório (projetos), Audiência (oportunidades), Venda (prospecção, cachês), entrega Orientada (execução e prestação de contas).

Regras:
1. Você TEM MEMÓRIA: recebe o contexto completo da carreira do artista (gigs, leads, pipeline, docs, riders, sabatinas). USE — cite valores, datas e nomes reais do contexto quando relevante.
2. Respostas curtas e diretas (2-5 frases), tom de empresário parceiro que fala a língua do artista. Português BR informal mas profissional.
3. Medir em R$: fale de cachê, pipeline, a receber — nunca de "viralizar" ou métricas de vaidade.
4. Quando perguntado sobre ação concreta, aponte a ferramenta do app (/agenda, /prospeccao, /pipeline, /rider, /prestacao, /epk).
5. Não prometa aprovação em edital nem invente contatos — se não souber, diga e sugira como descobrir.`;

function contextBlock(c: any): string {
  const p = c.profile;
  const lines: (string | null)[] = [
    `ARTISTA: ${p.name} (${p.personType})${p.city || p.uf ? ` — ${[p.city, p.uf].filter(Boolean).join("/")}` : ""}`,
    p.artAreas?.length ? `Áreas: ${p.artAreas.join(", ")}` : null,
    p.phone ? `Telefone: ${p.phone}` : null,
    "",
  ];

  const pipeline = c.pipeline ?? [];
  if (pipeline.length) {
    lines.push(`PIPELINE EDITAIS (${pipeline.length}):`);
    for (const i of pipeline.slice(0, 15)) {
      const o = i.opportunity;
      lines.push(
        `  · [${i.stage}] ${o?.name ?? "?"} — ${o?.sourceName ?? ""}` +
        `${o?.registrationTo ? ` · fecha ${o.registrationTo.slice(0, 10)}` : ""}` +
        `${i.sabatinaScore != null ? ` · banca ${i.sabatinaScore}/100` : ""}`
      );
    }
  }
  const leads = c.leads ?? [];
  if (leads.length) {
    lines.push(`LEADS COMERCIAIS (${leads.length}):`);
    for (const l of leads.slice(0, 15)) {
      lines.push(`  · [${l.status}] ${l.name} — ${l.kind}${l.city ? ` · ${l.city}` : ""}${l.contact ? ` · ${l.contact}` : ""}`);
    }
  }
  const gigs = c.gigs ?? [];
  if (gigs.length) {
    const aReceber = gigs.filter((g: any) => g.fee && g.status !== "pago" && g.status !== "cancelado")
      .reduce((s: number, g: any) => s + g.fee, 0);
    lines.push(`GIGS/TRABALHOS (${gigs.length}) — R$ ${aReceber.toLocaleString("pt-BR")} a receber:`);
    for (const g of gigs.slice(0, 15)) {
      lines.push(`  · [${g.status}] ${g.date} ${g.title}${g.venue ? ` · ${g.venue}` : ""}${g.fee ? ` · R$ ${g.fee.toLocaleString("pt-BR")}` : ""}`);
    }
  }
  const docs = (c.docs ?? []).filter((d: any) => d.expiresAt);
  if (docs.length) {
    lines.push(`DOCS C/ VENCIMENTO: ${docs.map((d: any) => `${d.name} (${d.expiresAt.slice(0, 10)})`).join(" · ")}`);
  }
  const riders = c.riders ?? [];
  if (riders.length) {
    lines.push(`RIDERS: ${riders.map((r: any) => `${r.name} (${r.members.length} músicos)`).join(" · ")}`);
  }
  const sab = c.sabatinas ?? [];
  if (sab.length) {
    lines.push(`SABATINAS FEITAS: ${sab.map((s: any) => `${s.score}/100`).join(", ")}`);
  }
  return lines.filter((l) => l !== null).join("\n");
}

export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json({ error: "LLM_API_KEY not configured" }, { status: 503 });
  }
  const { profileEmail, message } = (await req.json()) as {
    profileEmail: string;
    message: string;
  };
  if (!profileEmail || !message) {
    return NextResponse.json({ error: "profileEmail + message required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.getByEmail, { email: profileEmail })) as any;
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });
  const fullCtx = (await convex.query(api.riders.coachContext, { profileId: profile._id })) as any;

  const history = (fullCtx?.history ?? []).map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.text,
  }));

  const reply = await chat([
    { role: "system", content: `${COACH_SYSTEM}\n\n=== MEMÓRIA DA CARREIRA ===\n${contextBlock(fullCtx)}` },
    ...history,
    { role: "user", content: message },
  ]);

  await convex.mutation(api.riders.addMessage, { profileId: profile._id, role: "user", text: message });
  await convex.mutation(api.riders.addMessage, { profileId: profile._id, role: "assistant", text: reply });

  return NextResponse.json({ reply });
}
