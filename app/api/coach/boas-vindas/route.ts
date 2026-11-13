import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { chat } from "@/lib/llm";
import { contextBlock, runCoachTool, scrubInternal } from "@/lib/coach";

// Primeira mensagem do coach, logo depois do onboarding: diagnóstico com o que
// ele descobriu do artista + editais que combinam + o que falta + 1º passo.
// Só gera uma vez (se a conversa ainda estiver vazia).
export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  if (!token) return NextResponse.json({ error: "token" }, { status: 400 });
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.me, { token })) as any;
  if (!profile) return NextResponse.json({ error: "sessão inválida" }, { status: 401 });
  const ctx = (await convex.query(api.riders.coachContext, { profileId: profile._id })) as any;
  if (ctx?.history?.length) return NextResponse.json({ reply: null, existing: true });

  const radar = await runCoachTool(convex, profile, profile.email, { name: "buscar_editais", arguments: {} }).catch(() => "");
  const docs = (ctx?.docs ?? []).map((d: any) => d.name);
  let reply = "";
  try {
    reply = await chat([
      {
        role: "system",
        content:
          "Você é o Manager, empresário de carreira do artista. Escreva a PRIMEIRA mensagem pra ele, logo depois do cadastro, em português BR informal e direto, sem tabela nem título com #. Estrutura: 1) uma frase mostrando que você já o estudou (cite algo concreto da pesquisa; se a pesquisa não achou nada, diga que a presença online dele é pequena e que isso é a primeira coisa a resolver pra banca); 2) os 2 ou 3 editais do radar que mais combinam, cada um com nome, prazo e por quê, em lista com hífen; 3) o que falta no cofre de documentos pra se inscrever (RG/CPF, comprovante de residência, certidões, portfólio) considerando o que já tem; 4) UM primeiro passo claro com a rota do app (/documentos, /oportunidades, /sabatina/<id>). Máximo 170 palavras. Rotas: use só /documentos, /oportunidades, /coach e as rotas /sabatina/<código> EXATAMENTE como aparecem no RADAR (copie o código); nunca invente rota nem mostre a ref interna solta. Documentos de edital são RG, CPF, comprovante de residência, certidões negativas (federal, estadual, municipal, trabalhista, FGTS) e portfólio; não cite certidão de nascimento.",
      },
      {
        role: "user",
        content: `${contextBlock(ctx)}\n\nRADAR AGORA:\n${radar.slice(0, 2500)}\n\nDOCUMENTOS NO COFRE: ${docs.length ? docs.join(", ") : "nenhum"}`,
      },
    ]);
  } catch (e) {
    console.error("[boas-vindas]", e);
  }
  reply = scrubInternal(reply).trim();
  if (!reply) return NextResponse.json({ reply: null }, { status: 503 });
  await convex.mutation(api.riders.addMessage, { profileId: profile._id, role: "assistant", text: reply });
  return NextResponse.json({ reply });
}
