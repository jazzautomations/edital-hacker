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

  const { reply, actionsRun } = await chatWithTools(
    [
      { role: "system", content: `${COACH_SYSTEM}\n\n=== MEMÓRIA DA CARREIRA ===\n${contextBlock(fullCtx)}` },
      ...history,
      { role: "user", content: message },
    ],
    COACH_TOOLS,
    (call) => runCoachTool(convex, profile, profileEmail, call)
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
