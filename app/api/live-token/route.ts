import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice not configured" }, { status: 503 });
  }
  if (req.headers.get("origin") !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(Date.now() + 30 * 60_000).toISOString(),
        newSessionExpireTime: new Date(Date.now() + 60_000).toISOString(),
      },
    });
    return NextResponse.json({ token: token.name });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
