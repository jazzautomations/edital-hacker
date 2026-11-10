import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { chatWithTools, llmConfigured, type ToolDef } from "@/lib/llm";

const COACH_SYSTEM = `Você é o Manager — o agente de carreira do trabalhador da arte (músicos, DJs, produtores, professores de arte).

Filosofia: o artista manda, você executa. Você não é chatbot de conselho — quando o artista pede algo que uma ferramenta sua resolve, você CHAMA a ferramenta e entrega o resultado. Conselho é o que sobra depois da ação.
Vocabulário B.R.A.V.O.: Base (materiais, docs), Repertório (projetos), Audiência (oportunidades), Venda (prospecção, cachês), entrega Orientada (execução e prestação de contas).

Regras:
1. Você TEM MEMÓRIA: recebe o contexto completo da carreira do artista (gigs, leads, pipeline, docs, riders, sabatinas). USE — cite valores, datas e nomes reais do contexto quando relevante.
2. Você TEM BRAÇOS: pediu prospecção → prospect_leads. Pediu pra anotar show/cachê → create_gig. Pediu pra mover lead no funil → update_lead_status. Pediu documento (rider, EPK, contrato, proposta, prestação) → prepare_document. SÓ converse quando nenhuma tool se aplicar.
3. Respostas curtas e diretas (2-5 frases), tom de empresário parceiro que fala a língua do artista. Português BR informal mas profissional.
4. Medir em R$: fale de cachê, pipeline, a receber — nunca de "viralizar" ou métricas de vaidade.
5. Depois de executar, diga O QUE fez e ONDE o artista vê o resultado (/agenda, /prospeccao, /pipeline).
6. Não prometa aprovação em edital nem invente contatos — se uma tool falhar, diga honesto e sugira o caminho manual.`;

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

  const tools: ToolDef[] = [
    {
      name: "prospect_leads",
      description: "Caça leads comerciais reais na web (casas de show, festivais, marcas, escolas) pro nicho e cidade do artista. Leva ~30-60s.",
      parameters: {
        type: "object",
        properties: {
          leadType: { type: "string", description: "tipo: casa_de_show | festival | marca | escola | produtora" },
          niche: { type: "string", description: "nicho do artista, ex: 'MPB', 'forró', 'jazz'" },
          city: { type: "string" },
          uf: { type: "string", description: "sigla, ex: SP" },
        },
        required: ["leadType", "niche", "city"],
      },
    },
    {
      name: "create_gig",
      description: "Anota um trabalho/show na agenda do artista com data, local e cachê.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string", description: "ISO, ex: 2026-12-15" },
          venue: { type: "string" },
          fee: { type: "number", description: "cachê em R$" },
          notes: { type: "string" },
        },
        required: ["title", "date"],
      },
    },
    {
      name: "update_lead_status",
      description: "Move um lead do funil de prospecção: novo | contatado | respondeu | negociando | fechado | perdido. 'fechado' vira gig automaticamente.",
      parameters: {
        type: "object",
        properties: {
          leadName: { type: "string", description: "nome (ou parte) do lead" },
          status: { type: "string", enum: ["novo", "contatado", "respondeu", "negociando", "fechado", "perdido"] },
        },
        required: ["leadName", "status"],
      },
    },
    {
      name: "prepare_document",
      description: "Aponta o gerador de documento profissional: rider (rider técnico + mapa de palco), epk (press kit), contrato, proposta, prestacao (relatório Anexo V).",
      parameters: {
        type: "object",
        properties: { kind: { type: "string", enum: ["rider", "epk", "contrato", "proposta", "prestacao"] } },
        required: ["kind"],
      },
    },
  ];

  const { reply, actionsRun } = await chatWithTools(
    [
      { role: "system", content: `${COACH_SYSTEM}\n\n=== MEMÓRIA DA CARREIRA ===\n${contextBlock(fullCtx)}` },
      ...history,
      { role: "user", content: message },
    ],
    tools,
    async (call) => {
      switch (call.name) {
        case "prospect_leads": {
          const r = (await convex.action(api.discover.prospectLeads, {
            profileId: profile._id,
            leadType: String(call.arguments.leadType ?? "casa_de_show"),
            niche: String(call.arguments.niche ?? "música"),
            city: String(call.arguments.city ?? ""),
            uf: call.arguments.uf ? String(call.arguments.uf) : undefined,
          })) as any;
          return r?.error
            ? `Prospecção falhou: ${r.error}`
            : `Encontrados ${r.found} leads, ${r.upserted} entraram no funil em /prospeccao`;
        }
        case "create_gig": {
          await convex.mutation(api.gigs.add, {
            profileId: profile._id,
            title: String(call.arguments.title ?? "Trabalho"),
            date: String(call.arguments.date ?? ""),
            venue: call.arguments.venue ? String(call.arguments.venue) : undefined,
            fee: typeof call.arguments.fee === "number" ? call.arguments.fee : undefined,
            notes: call.arguments.notes ? String(call.arguments.notes) : undefined,
          });
          return `Anotado na agenda em /agenda: ${call.arguments.title} em ${String(call.arguments.date).slice(0, 10)}${call.arguments.fee ? ` — R$ ${call.arguments.fee}` : ""}`;
        }
        case "update_lead_status": {
          const leads = (await convex.query(api.leads.listForProfile, { profileId: profile._id })) as any[];
          const q = String(call.arguments.leadName ?? "").toLowerCase();
          const lead = leads.find((l) => l.name.toLowerCase().includes(q));
          if (!lead) return `Não achei lead com nome parecido com "${call.arguments.leadName}"`;
          await convex.mutation(api.leads.setStatus, { id: lead._id, status: String(call.arguments.status) });
          return `"${lead.name}" movido para ${call.arguments.status} em /prospeccao`;
        }
        case "prepare_document": {
          const appUrl = process.env.APP_URL ?? "";
          const map: Record<string, string> = {
            rider: `/rider — preenche a formação e gera o PDF com mapa de palco`,
            epk: `/epk?email=${encodeURIComponent(profileEmail)} — seu press kit vivo`,
            contrato: `/prospeccao — botão "gerar contrato" no card do lead`,
            proposta: `/prospeccao — botão "proposta" no card do lead`,
            prestacao: `/prestacao — seleciona o projeto e gera o Anexo V`,
          };
          return `Documento pronto pra gerar: ${appUrl}${map[String(call.arguments.kind)] ?? "/epk"}`;
        }
        default:
          return `Tool desconhecida: ${call.name}`;
      }
    }
  );

  const finalReply =
    reply ||
    (actionsRun.length
      ? `Feito: ${actionsRun.map((a) => a.result).join(" · ")}`
      : "Não consegui responder agora — tenta de novo?");

  await convex.mutation(api.riders.addMessage, { profileId: profile._id, role: "user", text: message });
  await convex.mutation(api.riders.addMessage, { profileId: profile._id, role: "assistant", text: finalReply });

  return NextResponse.json({ reply: finalReply, actions: actionsRun.map((a) => a.name) });
}
