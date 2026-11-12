import { NextResponse } from "next/server";
import { llmConfigured, sabatinaTurn, type SabatinaContext, type ChatTurn } from "@/lib/llm";

export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json({ error: "LLM_API_KEY not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const { context, history } = body as {
      context: SabatinaContext;
      history: ChatTurn[];
    };
    if (!context?.opportunity?.name) {
      return NextResponse.json({ error: "context.opportunity required" }, { status: 400 });
    }
    const result = await sabatinaTurn(context, history ?? []);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
