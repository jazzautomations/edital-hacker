import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { verifyParts } from "@/lib/sign";

// Chamado pela Agora quando a banca de voz invoca a tool submit_verdict.
// Persiste a sessão com veredito (mesmo shape da sabatina texto) e joga
// o score pro pipeline — a nota da banca cai no kanban.
export async function POST(req: Request) {
  const url = new URL(req.url);
  const opportunityId = url.searchParams.get("opp");
  const email = url.searchParams.get("email");
  if (!opportunityId || !email) {
    return NextResponse.json({ error: "opp + email required" }, { status: 400 });
  }

  if (!verifyParts(url.searchParams.get("sig"), "voice-verdict", opportunityId, email)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const args = (await req.json()) as {
    score: number;
    summary: string;
    gaps?: string[];
    missingDocs?: string[];
  };
  if (typeof args.score !== "number" || !args.summary) {
    return NextResponse.json({ error: "score + summary required" }, { status: 400 });
  }

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.getByEmail, { email })) as any;
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  const verdict = {
    score: Math.max(0, Math.min(100, args.score)),
    summary: args.summary,
    gaps: args.gaps ?? [],
    missingDocs: args.missingDocs ?? [],
  };

  await convex.mutation(api.sabatina.save, {
    profileId: profile._id,
    opportunityId: opportunityId as any,
    turns: [
      { role: "system", text: "Sabatina por voz (Agora) — transcript na plataforma Agora." },
      { role: "assistant", text: args.summary },
    ],
    verdict,
  });

  // Mesmo efeito do fluxo texto: score vai pro kanban.
  const items = (await convex.query(api.pipeline.listForProfile, {
    profileId: profile._id,
  })) as any[];
  const item = items.find((i) => i.opportunityId === opportunityId);
  if (item) {
    await convex.mutation(api.pipeline.setSabatinaResult, {
      id: item._id,
      sabatinaScore: verdict.score,
      sabatinaSummary: verdict.summary,
    }).catch(() => null);
  }

  // Resposta vira a próxima fala do agente (TTS) — texto falado, não JSON.
  return NextResponse.json({
    response:
      `Veredito gravado: ${verdict.score} de 100. ` +
      `Resumindo pra você: ${verdict.summary}`,
  });
}
