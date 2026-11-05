import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const LIVE_MODEL = "gemini-2.5-flash-native-audio-preview-12-2025";

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice not configured" }, { status: 503 });
  }
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const ai = new GoogleGenAI({ apiKey });
    const expireTime = new Date(Date.now() + 30 * 60_000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60_000).toISOString();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model: LIVE_MODEL,
          config: { responseModalities: ["AUDIO" as any] },
        },
      } as any,
    });
    return NextResponse.json({
      token: token.name,
      expireTime,
      newSessionExpireTime,
      model: LIVE_MODEL,
      config: { responseModalities: ["AUDIO"] },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
