import { NextResponse } from "next/server";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { signParts } from "@/lib/sign";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SABATINA_SYSTEM, contextBlock, type SabatinaContext } from "@/lib/llm";
import {
  COACH_SYSTEM,
  COACH_TOOLS,
  contextBlock as coachContextBlock,
} from "@/lib/coach";

// Sobe um agente da Agora Conversational AI no canal RTC — ASR + TTS + LLM
// managed (créditos Agora do usuário). Dois modos:
//   "sabatina" (default): banca simulada contra a rubrica do edital, grava
//     veredito no pipeline via tool submit_verdict.
//   "coach": o Manager vivo — memória da carreira no system prompt e as
//     mesmas tools do chat (prospect_leads, create_gig...) via /api/coach-tool.

const AGENT_API = "https://api.agora.io/api/conversational-ai-agent/v2/projects";

function rtcToken(appId: string, cert: string | undefined, channel: string, uid: number): string {
  // Sem certificado = projeto em modo testing (tokenless).
  if (!cert) return "";
  // 1h de validade cobre qualquer sabatina/conversa de demo.
  return RtcTokenBuilder.buildTokenWithUid(appId, cert, channel, uid, RtcRole.PUBLISHER, 3600, 3600);
}

export async function POST(req: Request) {
  const appId = process.env.AGORA_APP_ID;
  const customerId = process.env.AGORA_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
  if (!appId || !customerId || !customerSecret) {
    return NextResponse.json({ error: "AGORA_* not configured" }, { status: 503 });
  }

  const body = await req.json();
  const { opportunityId, token, mode = "sabatina" } = body as {
    opportunityId?: string;
    token: string;
    mode?: "sabatina" | "coach";
  };
  if (!token || (mode === "sabatina" && !opportunityId)) {
    return NextResponse.json({ error: "token (+ opportunityId no modo sabatina) required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.me, { token })) as any;
  if (!profile) {
    return NextResponse.json({ error: "sessão inválida" }, { status: 401 });
  }
  const profileEmail: string = profile.email;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  let system: string;
  let greeting: string;
  let tools: unknown[] = [];

  if (mode === "coach") {
    const fullCtx = (await convex.query(api.riders.coachContext, { profileId: profile._id })) as any;
    system =
      `${COACH_SYSTEM}\n\n=== MEMÓRIA DA CARREIRA ===\n${coachContextBlock(fullCtx)}\n\n` +
      `Modo VOZ: respostas curtas e faladas (1-3 frases), sem markdown, sem listas — conversa de empresário parceiro. ` +
      `Quando executar uma tool, confirme em uma frase o que fez e onde a pessoa vê o resultado.`;
    greeting =
      `Salve, ${profile.name.split(" ")[0]}! Sou teu Manager — sei onde tu tá na carreira. Manda: quer que eu cace lead, anote um show na agenda ou aponte um documento?`;
    tools = COACH_TOOLS.map((t) => ({
      type: "function",
      function: t,
      server: {
        url: `${appUrl}/api/coach-tool?name=${encodeURIComponent(t.name)}&email=${encodeURIComponent(profileEmail)}&sig=${signParts("coach-tool", t.name, profileEmail)}`,
        method: "POST",
      },
    }));
  } else {
    const opp = (await convex.query(api.opportunities.get, { id: opportunityId as any })) as any;
    if (!opp) {
      return NextResponse.json({ error: "opportunity not found" }, { status: 404 });
    }
    const ctx: SabatinaContext = {
      opportunity: {
        name: opp.name,
        sourceName: opp.sourceName,
        registrationTo: opp.registrationTo,
        proponentTypes: opp.proponentTypes ?? [],
        categories: opp.categories ?? [],
        totalResource: opp.totalResource,
        enriched: opp.enriched ?? null,
      },
      profile: {
        name: profile.name,
        personType: profile.personType,
        artAreas: profile.artAreas ?? [],
        uf: profile.uf,
        bio: profile.bio,
      },
    };
    system =
      `${SABATINA_SYSTEM}\n\n${contextBlock(ctx)}\n\n` +
      `Modo VOZ: respostas curtas e faladas (1-3 frases), sem markdown, sem listas — conversa de banca. ` +
      `No veredito final, NÃO fale o JSON: resuma a nota e os gaps em texto corrido.`;
    greeting =
      "Fala! Sou a tua banca simulada. Vamos testar tua proposta contra o edital de verdade — me conta em uma frase o que tu quer fazer.";
    tools = [
      {
        type: "function",
        function: {
          name: "submit_verdict",
          description:
            "Encerra a sabatina e grava o parecer oficial. Chame quando tiver avaliado a proposta contra a rubrica.",
          parameters: {
            type: "object",
            properties: {
              score: { type: "number", description: "Nota 0-100" },
              summary: { type: "string", description: "Parecer em 2-3 frases" },
              gaps: { type: "array", items: { type: "string" }, description: "Lacunas encontradas" },
              missingDocs: { type: "array", items: { type: "string" }, description: "Documentos exigidos que faltam" },
            },
            required: ["score", "summary", "gaps", "missingDocs"],
          },
        },
        server: {
          url: `${appUrl}/api/voice-verdict?opp=${opportunityId}&email=${encodeURIComponent(profileEmail)}&sig=${signParts("voice-verdict", String(opportunityId), profileEmail)}`,
          method: "POST",
        },
      },
    ];
  }

  const channel = `${mode}-${Date.now() % 100000}`;
  const userUid = 1001;
  const agentUid = 0;

  const joinRes = await fetch(`${AGENT_API}/${appId}/join`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${mode}-${Date.now()}`,
      properties: {
        channel,
        token: rtcToken(appId, process.env.AGORA_APP_CERTIFICATE, channel, agentUid),
        agent_rtc_uid: String(agentUid),
        remote_rtc_uids: [String(userUid)],
        enable_string_uid: false,
        idle_timeout: 180,
        // Formato validado contra a API (nov/2026): ASR nativo só precisa do idioma;
        // LLM e TTS "managed" exigem vendor + url (e model no TTS) da lista do plano.
        asr: { language: "pt-BR" },
        llm: {
          credential_mode: "managed",
          vendor: "openai",
          style: "openai",
          url: "https://api.openai.com/v1/chat/completions",
          system_messages: [{ role: "system", content: system }],
          greeting_message: greeting,
          failure_message: "Tive um problema técnico — pode repetir?",
          max_history: 10,
          params: { model: process.env.AGORA_LLM_MODEL ?? "gpt-4o-mini" },
          tools,
        },
        tts: {
          credential_mode: "managed",
          vendor: "openai",
          params: {
            model: "tts-1",
            voice: process.env.AGORA_TTS_VOICE ?? "coral",
            url: "https://api.openai.com/v1/audio/speech",
          },
        },
      },
    }),
  });

  if (!joinRes.ok) {
    const err = await joinRes.text();
    return NextResponse.json({ error: `Agora join HTTP ${joinRes.status}: ${err}` }, { status: 502 });
  }
  const agent = await joinRes.json();

  return NextResponse.json({
    appId,
    channel,
    uid: userUid,
    token: rtcToken(appId, process.env.AGORA_APP_CERTIFICATE, channel, userUid),
    agentId: agent.agent_id,
  });
}

// Encerra o agente na hora (sem isso ele fica até o idle_timeout gastando crédito).
// Antes de desligar, puxa o histórico da conversa e grava a transcrição no perfil.
export async function DELETE(req: Request) {
  const appId = process.env.AGORA_APP_ID;
  const customerId = process.env.AGORA_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
  const agentId = new URL(req.url).searchParams.get("agentId") ?? "";
  if (!appId || !customerId || !customerSecret) return NextResponse.json({ ok: false }, { status: 503 });
  if (!/^[A-Za-z0-9]{8,64}$/.test(agentId)) return NextResponse.json({ error: "agentId inválido" }, { status: 400 });
  const { token, mode, opportunityId } = (await req.json().catch(() => ({}))) as {
    token?: string;
    mode?: string;
    opportunityId?: string;
  };
  const auth = { Authorization: `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString("base64")}` };

  let saved = false;
  if (token) {
    try {
      const h = await fetch(`${AGENT_API}/${appId}/agents/${agentId}/history`, { headers: auth });
      const data = h.ok ? ((await h.json()) as { contents?: { role?: string; content?: unknown }[] }) : null;
      const turns = (data?.contents ?? [])
        .filter((c) => (c.role === "user" || c.role === "assistant") && typeof c.content === "string")
        .map((c) => ({ role: String(c.role), text: String(c.content) }));
      if (turns.length) {
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        await convex.mutation(api.voice.saveCall, {
          token,
          mode: mode === "sabatina" ? "sabatina" : "coach",
          opportunityId: (opportunityId || undefined) as never,
          turns,
        });
        saved = true;
      } else if (!h.ok) {
        console.error("[voice history]", h.status, await h.text().catch(() => ""));
      }
    } catch (e) {
      console.error("[voice history]", e);
    }
  }

  const r = await fetch(`${AGENT_API}/${appId}/agents/${agentId}/leave`, {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
  }).catch(() => null);
  return NextResponse.json({ ok: Boolean(r?.ok), saved });
}
