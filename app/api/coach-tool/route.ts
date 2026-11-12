import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { runCoachTool } from "@/lib/coach";
import { verifyParts } from "@/lib/sign";

// Endpoint das tools do coach de VOZ: o agente Agora chama aqui com o nome da
// tool na query (?name=prospect_leads&email=...) e os args no body JSON.
// Mesma execução do coach texto — runCoachTool é a única fonte.

export async function POST(req: Request) {
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  const email = url.searchParams.get("email") ?? "";
  if (!name || !email) {
    return NextResponse.json({ error: "name + email required" }, { status: 400 });
  }

  if (!verifyParts(url.searchParams.get("sig"), "coach-tool", name, email)) {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }

  const args = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const profile = (await convex.query(api.profiles.getByEmail, { email, secret: process.env.NOTIFY_SECRET ?? "" })) as any;
  if (!profile) return NextResponse.json({ error: "profile not found" }, { status: 404 });

  const result = await runCoachTool(convex, profile, email, { name, arguments: args });
  return NextResponse.json({ result });
}
