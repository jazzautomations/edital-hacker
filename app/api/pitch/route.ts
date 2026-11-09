import { NextResponse } from "next/server";
import { chat } from "@/lib/llm";

// O coach escreve o pitch de booking; o artista revisa e envia (mailto).
// Filosofia "preparar, não executar por você" — e zero OAuth na demo.
export async function POST(req: Request) {
  if (!process.env.LLM_API_KEY) {
    return NextResponse.json({ error: "LLM_API_KEY not configured" }, { status: 503 });
  }
  try {
    const { profile, lead } = (await req.json()) as {
      profile: { name: string; artAreas: string[]; bio?: string; portfolioUrl?: string };
      lead: { name: string; kind: string; city?: string };
    };
    if (!profile?.name || !lead?.name) {
      return NextResponse.json({ error: "profile + lead required" }, { status: 400 });
    }
    const text = await chat([
      {
        role: "system",
        content:
          "Você escreve pitches de booking curtos e humanos em PT-BR para artistas independentes. " +
          "Regras: 3-4 frases no corpo, sem clichê de marketing, menciona um gancho concreto pro contratante " +
          "(ocupação, público-alvo, formato do show/aula), termina com pergunta de disponibilidade. " +
          "Responda JSON: {\"subject\": \"...\", \"body\": \"...\"}",
      },
      {
        role: "user",
        content:
          `Artista: ${profile.name} — ${profile.artAreas.join(", ")}` +
          (profile.bio ? ` — bio: ${profile.bio}` : "") +
          (profile.portfolioUrl ? ` — portfólio: ${profile.portfolioUrl}` : "") +
          `\nLead: ${lead.name} (${lead.kind.replaceAll("_", " ")}${lead.city ? `, ${lead.city}` : ""})\nEscreva o pitch.`,
      },
    ]);
    const m = text.match(/\{[\s\S]*\}/);
    const parsed = m ? JSON.parse(m[0]) : { subject: `Proposta — ${profile.name}`, body: text };
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
