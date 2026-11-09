import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SABATINA_SYSTEM, contextBlock, type SabatinaContext } from "@/lib/llm";

// Cria uma sessão de sabatina por voz: sobe um agente da Agora Conversational AI
// no canal RTC apontando o LLM pro nosso /api/voice-llm (Gemini por trás).
// ASR + TTS rodam "managed" — saem dos créditos Agora do usuário.

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
  const { opportunityId, profileEmail } = body as {
    opportunityId: string;
    profileEmail: string;
  };
  if (!opportunityId || !profileEmail) {
    return NextResponse.json({ error: "opportunityId + profileEmail required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const opp = (await convex.query(api.opportunities.get, { id: opportunityId as any })) as any;
  const profile = (await convex.query(api.profiles.getByEmail, { email: profileEmail })) as any;
  if (!opp || !profile) {
    return NextResponse.json({ error: "opportunity or profile not found" }, { status: 404 });
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

  const channel = `sabatina-${opportunityId.slice(-6)}-${Date.now() % 10000}`;
  const userUid = 1001;
  const agentUid = 0;

  const joinRes = await fetch(`${AGENT_API}/${appId}/join`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${customerId}:${customerSecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `sabatina-${Date.now()}`,
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
          system_messages: [
            {
              role: "system",
              content:
                `${SABATINA_SYSTEM}\n\n${contextBlock(ctx)}\n\n` +
                `Modo VOZ: respostas curtas e faladas (1-3 frases), sem markdown, sem listas — conversa de banca. ` +
                `No veredito final, NÃO fale o JSON: resuma a nota e os gaps em texto corrido.`,
            },
          ],
          greeting_message:
            "Fala! Sou a tua banca simulada. Vamos testar tua proposta contra o edital de verdade — me conta em uma frase o que tu quer fazer.",
          failure_message: "Tive um problema técnico — pode repetir?",
          max_history: 10,
          params: { model: process.env.AGORA_LLM_MODEL ?? "gpt-4o-mini" },
          // Tool calling: quando a banca encerra, o agente chama submit_verdict
          // → /api/voice-verdict persiste score+gaps no pipeline (mesmo lugar do texto).
          tools: [
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
                url: `${process.env.APP_URL ?? "http://localhost:3000"}/api/voice-verdict?opp=${opportunityId}&email=${encodeURIComponent(profileEmail)}`,
                method: "POST",
              },
            },
          ],
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
