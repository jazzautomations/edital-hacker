import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { chatWithTools, llmConfigured } from "@/lib/llm";
import { COACH_SYSTEM, COACH_TOOLS, contextBlock, runCoachTool } from "@/lib/coach";

export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json({ error: "LLM_API_KEY not configured" }, { status: 503 });
  }
  const { token, message } = (await req.json()) as { token: string; message: string };
  if (!token || !message) {
    return NextResponse.json({ error: "token + message required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  // a sessão diz quem é: ninguém conversa (nem executa ação) no perfil de outro
  const profile = (await convex.query(api.profiles.me, { token })) as any;
  if (!profile) return NextResponse.json({ error: "sessão inválida" }, { status: 401 });
  const profileEmail: string = profile.email;
  const fullCtx = (await convex.query(api.riders.coachContext, { profileId: profile._id })) as any;

  // histórico enxuto: as 10 últimas, cada uma cortada (resposta longa antiga só gasta cota)
  const history = (fullCtx?.history ?? []).slice(-10).map((m: any) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.text).slice(0, 700),
  }));

  let reply = "";
  let actionsRun: { name: string; result: string }[] = [];
  try {
    ({ reply, actionsRun } = await chatWithTools(
    [
      { role: "system", content: `${COACH_SYSTEM}\n\n=== MEMÓRIA DA CARREIRA ===\n${contextBlock(fullCtx)}` },
      ...history,
      { role: "user", content: message },
    ],
    COACH_TOOLS,
    async (call) => {
      const result = await runCoachTool(convex, profile, profileEmail, call);
      await convex
        .mutation(api.activity.log, {
          profileId: profile._id,
          verb: call.name.replaceAll("_", " "),
          detail: JSON.stringify(call.arguments).slice(0, 300),
          result: result.startsWith("Tool desconhecida") ? "erro" : "ok",
        })
        .catch(() => {});
      return result;
    }
    ));
  } catch (e) {
    console.error("[coach]", e);
    return NextResponse.json(
      { reply: "O coach tá sem cérebro agora (provedor de IA fora). Tenta de novo em 1 min.", error: String(e).slice(0, 200) },
      { status: 503 }
    );
  }

  const finalReply =
    reply ||
    (actionsRun.length
      ? `Feito: ${actionsRun.map((a) => a.result).join(" · ")}`
      : "Não consegui responder agora — tenta de novo?");

  await convex.mutation(api.riders.addMessage, { profileId: profile._id, role: "user", text: message });
  await convex.mutation(api.riders.addMessage, { profileId: profile._id, role: "assistant", text: finalReply });

  return NextResponse.json({ reply: finalReply, actions: actionsRun.map((a) => a.name) });
}
