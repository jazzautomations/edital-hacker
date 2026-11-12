import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { chatWithTools, llmConfigured } from "@/lib/llm";
import { COACH_SYSTEM, COACH_TOOLS, contextBlock, runCoachTool } from "@/lib/coach";

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
