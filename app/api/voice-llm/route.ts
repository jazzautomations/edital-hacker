import { completions, llmConfigured } from "@/lib/llm";

// Endpoint OpenAI-compatível que a Agora Conversational AI chama (llm.url)
// quando usamos LLM próprio em vez do managed. Proxy streaming direto pro
// provider configurado em LLM_BASE_URL/LLM_API_KEY — o system prompt (sabatina
// + rubrica + perfil) já vem nas messages que a Agora repassa.

export async function POST(req: Request) {
  const expected = process.env.VOICE_LLM_API_KEY;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  if (!llmConfigured()) return new Response("LLM_API_KEY not configured", { status: 503 });

  const body = await req.json();
  let upstream: Response;
  try {
    upstream = await completions({ ...body, stream: true });
  } catch (e) {
    return new Response(String(e).slice(0, 300), { status: 502 });
  }
  if (!upstream.body) return new Response("LLM sem corpo", { status: 502 });

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
