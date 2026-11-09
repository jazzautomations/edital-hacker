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
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return new Response("LLM_API_KEY not configured", { status: 503 });

  const body = await req.json();
  const baseUrl = (process.env.LLM_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");

  const upstream = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      ...body,
      model: process.env.LLM_MODEL ?? body.model ?? "gpt-4o-mini",
      stream: true,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text();
    return new Response(`LLM HTTP ${upstream.status}: ${err.slice(0, 200)}`, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
