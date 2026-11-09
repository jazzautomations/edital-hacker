import { GoogleGenAI } from "@google/genai";

// Endpoint OpenAI-compatível que a Agora Conversational AI chama (llm.url).
// O prompt do sistema (sabatina + rubrica do edital + perfil) vem nas
// system_messages configuradas no join — a Agora repassa como messages[0].

export async function POST(req: Request) {
  const expected = process.env.VOICE_LLM_API_KEY;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${expected}`) {
      return new Response("unauthorized", { status: 401 });
    }
  }
  const key = process.env.GEMINI_API_KEY;
  if (!key) return new Response("GEMINI_API_KEY not configured", { status: 503 });

  const body = await req.json();
  const messages: { role: string; content: string }[] = body.messages ?? [];

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  contents.unshift({ role: "user", parts: [{ text: system || "Responda em português." }] });

  const ai = new GoogleGenAI({ apiKey: key });
  const stream = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: contents as any,
  });

  const id = `chatcmpl-${Date.now()}`;
  const encoder = new TextEncoder();
  const sse = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.text ?? "";
        if (!text) continue;
        const payload = {
          id,
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model: body.model ?? "gemini-3-flash-preview",
          choices: [{ index: 0, delta: { content: text }, finish_reason: null }],
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      }
      const done = {
        id,
        object: "chat.completion.chunk",
        created: Math.floor(Date.now() / 1000),
        model: body.model ?? "gemini-3-flash-preview",
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      };
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(done)}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(sse, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
