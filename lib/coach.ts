import type { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { ToolCall, ToolDef } from "@/lib/llm";
import {
  calendarConfigured,
  calendarStatus,
  composioConfigured,
  createCalendarEvent,
  createDraft,
  fetchInbox,
  gmailStatus,
  listCalendarEvents,
} from "@/lib/composio";
import { ruleFor } from "@/lib/docRules";
import { AGENCY_INTEL } from "@/lib/agencySeed";

// Lógica do coach compartilhada entre /api/coach (chat texto), /api/coach-tool
// (tools da voz via Agora) e voice-session (system prompt do agente).

export const COACH_SYSTEM = `Você é o Manager — o agente de carreira do trabalhador da arte (músicos, DJs, produtores, professores de arte).

Filosofia: o artista manda, você executa. Você não é chatbot de conselho — quando o artista pede algo que uma ferramenta sua resolve, você CHAMA a ferramenta e entrega o resultado. Conselho é o que sobra depois da ação.
Vocabulário B.R.A.V.O.: Base (materiais, docs), Repertório (projetos), Audiência (oportunidades), Venda (prospecção, cachês), entrega Orientada (execução e prestação de contas).

Regras:
1. Você TEM MEMÓRIA: recebe o contexto completo da carreira do artista (gigs, leads, pipeline, docs, riders, sabatinas). USE — cite valores, datas e nomes reais do contexto quando relevante.
2. Você TEM BRAÇOS: pediu prospecção → prospect_leads. Pediu pra anotar show/cachê → create_gig. Pediu pra mover lead no funil → update_lead_status. Pediu documento (rider, EPK, contrato, proposta, prestação) → prepare_document. Perguntou de email → list_unanswered_emails; pediu resposta → draft_email_reply (sempre rascunho, nunca envia). Perguntou de agenda/disponibilidade → check_calendar; pediu pra botar no Google Calendar → sync_gig_to_calendar. Perguntou preço/quanto cobrar → consultar_cache (benchmark REAL do PNCP). SÓ converse quando nenhuma tool se aplicar.
2b. RAPPORT É LEI: antes de redigir email de abordagem ou proposta pra um lead/edital, chama research_target se o dossiê ainda não existir — e SEMPRE use os ganchos de rapport do dossiê no texto (citar show recente, linguagem deles, projeto específico). Email genérico é spam.
3. Respostas curtas e diretas (2-5 frases), tom de empresário parceiro que fala a língua do artista. Português BR informal mas profissional.
4. Medir em R$: fale de cachê, pipeline, a receber — nunca de "viralizar" ou métricas de vaidade.
5. Depois de executar, diga O QUE fez e ONDE o artista vê o resultado (/agenda, /prospeccao, /pipeline).
6. Não prometa aprovação em edital nem invente contatos — se uma tool falhar, diga honesto e sugira o caminho manual.`;

export function contextBlock(c: any): string {
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
    const dossiers = leads.filter((l: any) => l.dossier);
    if (dossiers.length) {
      lines.push(`DOSSIÊS (OSINT — use os ganchos de rapport ao redigir abordagem/email):`);
      for (const l of dossiers.slice(0, 8)) {
        lines.push(`  · ${l.name}: ${String(l.dossier).slice(0, 500)}`);
      }
    }
  }
  const oppsWithIntel = (c.pipeline ?? []).filter((i: any) => i.opportunity?.intel);
  if (oppsWithIntel.length) {
    lines.push(`INTEL DE EDITAIS (OSINT do financiador — use na sabatina/proposta):`);
    for (const i of oppsWithIntel.slice(0, 5)) {
      lines.push(`  · ${i.opportunity.name}: ${String(i.opportunity.intel).slice(0, 400)}`);
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
    lines.push(
      `DOCS C/ VENCIMENTO: ${docs
        .map((d: any) => {
          const r = ruleFor(`${d.name} ${d.kind ?? ""}`);
          return `${d.name} (${d.expiresAt.slice(0, 10)})${r ? ` [regra: ${r.hint}]` : ""}`;
        })
        .join(" · ")}`
    );
    lines.push(`REGRA DE OURO: CRF-FGTS vale só 30 dias — manda o artista emitir na semana da entrega do edital, nunca antes junto com as federais (180d).`);
  }
  const riders = c.riders ?? [];
  if (riders.length) {
    lines.push(`RIDERS: ${riders.map((r: any) => `${r.name} (${r.members.length} músicos)`).join(" · ")}`);
  }
  const sab = c.sabatinas ?? [];
  if (sab.length) {
    lines.push(`SABATINAS FEITAS: ${sab.map((s: any) => `${s.score}/100`).join(", ")}`);
  }
  lines.push("", "MERCADO (intel verificada — use pra aconselhar sobre agências/empresários):");
  for (const i of AGENCY_INTEL) lines.push(`  · ${i}`);
  return lines.filter((l) => l !== null).join("\n");
}

export const COACH_TOOLS: ToolDef[] = [
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
  {
    name: "list_unanswered_emails",
    description: "Lista os emails não-lidos da caixa do artista (Gmail via Composio) — pra 'que emails preciso responder?'.",
    parameters: {
      type: "object",
      properties: { max: { type: "number", description: "máx de emails, default 10" } },
    },
  },
  {
    name: "draft_email_reply",
    description: "Cria RASCUNHO de resposta no Gmail do artista — ele revisa e envia. Nunca envia direto.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string", description: "email do destinatário" },
        subject: { type: "string" },
        body: { type: "string", description: "corpo do email, tom profissional do artista — usa gancho de rapport do dossiê se houver" },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "research_target",
    description: "Monta DOSSIÊ OSINT de um alvo antes da abordagem — pesquisa web sobre o contratante (lead do funil) ou financiador (edital do pipeline) e salva ganchos de rapport. Leva ~30s. Use ANTES de redigir email/proposta se o dossiê não existir.",
    parameters: {
      type: "object",
      properties: {
        target: { type: "string", enum: ["lead", "edital"] },
        name: { type: "string", description: "nome (ou parte) do lead ou do edital" },
      },
      required: ["target", "name"],
    },
  },
  {
    name: "check_calendar",
    description: "Lê o Google Calendar do artista pra checar disponibilidade/conflito num período (precisa estar conectado).",
    parameters: {
      type: "object",
      properties: {
        from: { type: "string", description: "ISO, ex: 2026-12-01" },
        to: { type: "string", description: "ISO, ex: 2026-12-15" },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "review_contract",
    description: "Revisa contrato de show/apresentação — cola o texto e recebe parecer com red flags (pagamento, exclusividade, cessão de imagem, ECAD, cancelamento, foro) e redação sugerida. Âncora: Portaria MTP 671/2021.",
    parameters: {
      type: "object",
      properties: { text: { type: "string", description: "texto do contrato colado pelo artista" } },
      required: ["text"],
    },
  },
  {
    name: "sync_gig_to_calendar",
    description: "Empurra um gig/evento pro Google Calendar do artista (precisa estar conectado).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "ISO com hora, ex: 2026-12-15T20:00:00-03:00" },
        venue: { type: "string" },
        durationMin: { type: "number", description: "duração em minutos, default 120" },
        notes: { type: "string" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "consultar_cache",
    description:
      "Benchmark de cachê público — consulta contratos reais de show no PNCP (prefeituras que contrataram artista por inexigibilidade, com valor itemizado por lei). Use pra responder 'quanto posso cobrar', 'quanto prefeitura paga' ou pra precificar proposta. Dado REAL com fonte.",
    parameters: {
      type: "object",
      properties: {
        uf: { type: "string", description: "UF pra filtrar (ex: CE, MG). Omitir pra Brasil todo" },
        q: { type: "string", description: "busca livre — nome de artista, tipo de evento, município" },
      },
    },
  },
];

/** Executa uma tool do coach contra o Convex. Retorna texto pro LLM/áudio. */
export async function runCoachTool(
  convex: ConvexHttpClient,
  profile: any,
  profileEmail: string,
  call: ToolCall
): Promise<string> {
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
    case "list_unanswered_emails": {
      if (!composioConfigured()) {
        return "Gmail ainda não conectado — falta COMPOSIO_API_KEY + conta conectada. Diz pro artista que é 1 clique de OAuth quando configurado.";
      }
      const st = await gmailStatus(profileEmail);
      if (!st.connected) return `Gmail não conectado ainda — vai em /coach e clica "Conectar Gmail" (1 clique de OAuth).`;
      const max = typeof call.arguments.max === "number" ? call.arguments.max : 10;
      const emails = await fetchInbox(profileEmail, "in:inbox is:unread", max);
      if (!emails.length) return "Caixa zerada — nenhum não-lido. 🤘";
      return `NÃO-LIDOS (${emails.length}):\n` + emails.map((e, i) => `  ${i + 1}. ${e.from} — "${e.subject}"`).join("\n");
    }
    case "draft_email_reply": {
      if (!composioConfigured()) {
        return "Gmail ainda não conectado — o rascunho fica pronto no texto, mas pra criar de verdade falta COMPOSIO_API_KEY.";
      }
      const id = await createDraft(
        profileEmail,
        String(call.arguments.to ?? ""),
        String(call.arguments.subject ?? ""),
        String(call.arguments.body ?? "")
      );
      return `Rascunho criado no Gmail (${id}) — o artista revisa e envia.`;
    }
    case "research_target": {
      const target = String(call.arguments.target);
      const needle = String(call.arguments.name ?? "").toLowerCase();
      if (target === "lead") {
        const leads = (await convex.query(api.leads.listForProfile, { profileId: profile._id })) as any[];
        const lead = leads.find((l) => l.name.toLowerCase().includes(needle));
        if (!lead) return `Lead "${call.arguments.name}" não tá no funil — confere o nome ou prospecta primeiro.`;
        if (lead.dossier) return `Dossiê de ${lead.name} já existe:\n${lead.dossier.slice(0, 1200)}`;
        const d = await convex.action(api.dossier.research, {
          targetType: "lead",
          id: String(lead._id),
          profileId: profile._id,
          name: lead.name,
          city: lead.city,
          uf: lead.uf,
          kind: lead.kind,
          sourceUrl: lead.sourceUrl,
          hint: `${profile.name} — ${profile.artAreas?.join(", ") ?? ""}`,
        });
        return `Dossiê pronto e salvo no lead:\n${String(d).slice(0, 1200)}`;
      }
      const pipeline = (await convex.query(api.pipeline.listForProfile, { profileId: profile._id })) as any[];
      const item = pipeline.find((i: any) => i.opportunity?.name?.toLowerCase().includes(needle));
      if (!item?.opportunity) return `Edital "${call.arguments.name}" não tá no pipeline.`;
      const opp = item.opportunity;
      if (opp.intel) return `Intel de "${opp.name}" já existe:\n${String(opp.intel).slice(0, 1200)}`;
      const d = await convex.action(api.dossier.research, {
        targetType: "opportunity",
        id: String(opp._id),
        profileId: profile._id,
        name: opp.name,
        sourceUrl: opp.sourceUrl,
        hint: `${profile.name} — ${profile.artAreas?.join(", ") ?? ""}`,
      });
      return `Intel do financiador pronta e salva no edital:\n${String(d).slice(0, 1200)}`;
    }
    case "review_contract": {
      const { CONTRACT_REVIEW_SYSTEM } = await import("@/app/api/revisar-contrato/route");
      const parecer = await import("@/lib/llm").then((m) =>
        m.chat([
          { role: "system", content: CONTRACT_REVIEW_SYSTEM },
          { role: "user", content: String(call.arguments.text ?? "").slice(0, 20000) },
        ])
      );
      return parecer;
    }
    case "check_calendar": {
      if (!calendarConfigured()) return "Calendar não configurado — falta COMPOSIO_CALENDAR_AUTH_CONFIG.";
      if (!(await calendarStatus(profileEmail))) return `Calendar não conectado — vai em /coach e clica "conectar agenda".`;
      const from = String(call.arguments.from);
      const to = String(call.arguments.to);
      const events = await listCalendarEvents(profileEmail, from, to);
      if (!events.length) return `Agenda livre entre ${from.slice(0, 10)} e ${to.slice(0, 10)}. 🤘`;
      return `EVENTOS (${events.length}) ${from.slice(0, 10)} → ${to.slice(0, 10)}:\n` +
        events.map((e) => `  · ${e.start?.slice(0, 16) ?? "?"} ${e.summary}`).join("\n");
    }
    case "sync_gig_to_calendar": {
      if (!calendarConfigured()) return "Calendar não configurado — falta COMPOSIO_CALENDAR_AUTH_CONFIG.";
      if (!(await calendarStatus(profileEmail))) return `Calendar não conectado — vai em /coach e clica "conectar agenda".`;
      const id = await createCalendarEvent(profileEmail, {
        summary: `${call.arguments.title} · Manager`,
        startISO: String(call.arguments.date),
        location: String(call.arguments.venue ?? ""),
        durationMin: typeof call.arguments.durationMin === "number" ? call.arguments.durationMin : 120,
        description: String(call.arguments.notes ?? ""),
      });
      return `No Google Calendar (${id}) — ${call.arguments.title} em ${String(call.arguments.date).slice(0, 16)}.`;
    }
    case "consultar_cache": {
      const r = (await convex.action(api.pncp.benchmark, {
        uf: call.arguments.uf ? String(call.arguments.uf).toUpperCase() : undefined,
        q: call.arguments.q ? String(call.arguments.q) : undefined,
      })) as any;
      if (!r?.contratos?.length)
        return `Sem contratos artísticos encontrados${call.arguments.uf ? ` em ${call.arguments.uf}` : ""} nessa busca — tenta outro termo ou tira o filtro de UF.`;
      const fmt = (v?: number) => (v ? `R$ ${Math.round(v).toLocaleString("pt-BR")}` : "—");
      return (
        `BENCHMARK PNCP (${r.amostra} contratos recentes${r.mediana ? ` · mediana ${fmt(r.mediana)}` : ""}):\n` +
        r.contratos
          .slice(0, 10)
          .map((c: any) => `  · ${c.artista ?? "?"} — ${fmt(c.valor)} em ${c.municipio}/${c.uf}${c.data ? ` (${String(c.data).slice(0, 7)})` : ""}`)
          .join("\n") +
        `\n\nUse: mediana pra precificar; contrato similar citado por número na justificativa de preço da prefeitura (Lei 14.133 art. 23).`
      );
    }
    default:
      return `Tool desconhecida: ${call.name}`;
  }
}
