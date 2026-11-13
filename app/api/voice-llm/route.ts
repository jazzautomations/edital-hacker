import { after } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { chatWithTools } from "@/lib/llm";
import { COACH_TOOLS, runCoachTool, scrubInternal } from "@/lib/coach";
import { verifyParts } from "@/lib/sign";

// Cérebro da voz. A Agora (ASR + TTS) chama aqui como se fosse a OpenAI
// (llm.url) e nós rodamos o MESMO agente do coach de texto, com as tools
// executando no nosso servidor. O tool calling "managed" da Agora nunca
// executava nada: o agente só prometia que ia pesquisar.
// Resposta em SSE no formato chat.completion.chunk: a primeira frase
// ("peraí, tô pesquisando") sai na hora e a resposta final depois.

const SLOW = new Set(["prospect_leads", "mapear_agencia"]);
const FILLER: Record<string, string> = {
  pesquisar_web: "Peraí, tô pesquisando isso na internet.",
  buscar_editais: "Deixa eu olhar o radar.",
  ler_edital: "Vou abrir o edital aqui.",
  checklist_edital: "Vou cruzar o edital com teus documentos.",
  consultar_cache: "Vou ver quanto as prefeituras andam pagando.",
};

function chunk(text: string, finish = false) {
  return `data: ${JSON.stringify({
    id: "chatcmpl-manager",
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model: "manager-coach",
    choices: [{ index: 0, delta: finish ? {} : { role: "assistant", content: text }, finish_reason: finish ? "stop" : null }],
  })}\n\n`;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "";
  if (!email || !verifyParts(url.searchParams.get("sig"), "voice-llm", email)) {
    return new Response("unauthorized", { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as { messages?: any[] };
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.getByEmail, { email, secret: process.env.NOTIFY_SECRET ?? "" })) as any;
  if (!profile) return new Response("perfil não encontrado", { status: 404 });

  // a Agora manda system + histórico; ferramentas antigas que ela tenha anexado não interessam
  const messages = (body.messages ?? [])
    .filter((m) => m && (m.role === "system" || m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content }));

  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (t: string) => controller.enqueue(enc.encode(chunk(t)));
      let spoke = false;
      try {
        const { reply, actionsRun } = await chatWithTools(
          messages,
          COACH_TOOLS,
          async (call) => {
            if (SLOW.has(call.name)) {
              // leva minutos: roda depois da resposta, a pessoa vê o resultado no app
              after(() => runCoachTool(convex, profile, email, call).catch((e) => console.error("[voz tool]", call.name, e)));
              return call.name === "prospect_leads"
                ? "Prospecção começou agora em segundo plano; em uns 2 minutos os contratantes aparecem em /prospeccao. Diga isso ao artista."
                : "Mapeamento da agência começou em segundo plano; em 2 a 4 minutos os contratantes aparecem em /prospeccao. Diga isso ao artista.";
            }
            const r = await runCoachTool(convex, profile, email, call).catch((e) => `ERRO: ${String(e).slice(0, 160)}`);
            await convex.mutation(api.activity.log, { profileId: profile._id, verb: call.name.replaceAll("_", " "), detail: JSON.stringify(call.arguments).slice(0, 300), result: r.startsWith("ERRO") ? "erro" : "ok" }).catch(() => {});
            return r;
          },
          (names, said) => {
            if (spoke) return;
            spoke = true;
            send(`${said?.trim() || FILLER[names[0]] || "Só um instante, já faço isso."} `);
          }
        );
        const final = scrubInternal(reply || (actionsRun.length ? actionsRun.map((a) => a.result).join(" ") : ""))
          // na voz, rota vira nome de tela
          .replace(/\/sabatina\/[a-z0-9]+/g, "a banca simulada do edital")
          .replace(/\/(oportunidades|pipeline|prospeccao|agenda|documentos|assinaturas|coach|inicio|rider|prestacao)\b/g, (_, r: string) => ({ oportunidades: "o radar", prospeccao: "a prospecção", prestacao: "a prestação de contas", inicio: "o início" } as Record<string, string>)[r] ?? r)
          .replace(/\*\*/g, "");
        send(final || "Não consegui fazer isso agora. Tenta de novo?");
      } catch (e) {
        console.error("[voice-llm]", e);
        send("Tive um problema técnico aqui. Pode repetir?");
      }
      controller.enqueue(enc.encode(chunk("", true)));
      controller.enqueue(enc.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" } });
}
