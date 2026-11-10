import { NextResponse } from "next/server";
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
  // Sem certificado = projeto em modo dev/testing (tokenless). Com certificado,
  // gerar token real requer o pacote agora-token — tratado quando a credencial chegar.
  if (!cert) return "";
  throw new Error("AGORA_APP_CERTIFICATE set but token generation not implemented yet");
}

export async function POST(req: Request) {
  const appId = process.env.AGORA_APP_ID;
  const customerId = process.env.AGORA_CUSTOMER_ID;
  const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
  if (!appId || !customerId || !customerSecret) {
    return NextResponse.json({ error: "AGORA_* not configured" }, { status: 503 });
  }

  const body = await req.json();
  const { opportunityId, profileEmail, mode = "sabatina" } = body as {
    opportunityId?: string;
    profileEmail: string;
    mode?: "sabatina" | "coach";
  };
  if (!profileEmail || (mode === "sabatina" && !opportunityId)) {
    return NextResponse.json({ error: "profileEmail (+ opportunityId no modo sabatina) required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.getByEmail, { email: profileEmail })) as any;
  if (!profile) {
    return NextResponse.json({ error: "profile not found" }, { status: 404 });
  }

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
        url: `${appUrl}/api/coach-tool?name=${encodeURIComponent(t.name)}&email=${encodeURIComponent(profileEmail)}`,
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
          url: `${appUrl}/api/voice-verdict?opp=${opportunityId}&email=${encodeURIComponent(profileEmail)}`,
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
        asr: { credential_mode: "managed", params: { language: "pt-BR" } },
        llm: {
          credential_mode: "managed",
          vendor: "openai",
          style: "openai",
          system_messages: [{ role: "system", content: system }],
          greeting_message: greeting,
          failure_message: "Tive um problema técnico — pode repetir?",
          max_history: 10,
          params: { model: process.env.AGORA_LLM_MODEL ?? "gpt-4o-mini" },
          tools,
        },
        tts: { credential_mode: "managed" },
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
