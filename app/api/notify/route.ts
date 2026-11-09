import { NextResponse } from "next/server";
import { notifyCoach, type Channel } from "@/lib/notify";

// Endpoint interno chamado pelas actions do Convex (alerts/digest).
// Vive no Next porque a Evolution API está na tailnet — Convex cloud não alcança.
// Protegido por NOTIFY_SECRET compartilhado com o Convex env.
export async function POST(req: Request) {
  const secret = req.headers.get("x-notify-secret");
  if (!process.env.NOTIFY_SECRET || secret !== process.env.NOTIFY_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { phone, text, urgent, channel } = (await req.json()) as {
    phone: string;
    text: string;
    urgent?: boolean;
    channel?: Channel;
  };
  if (!phone || !text) {
    return NextResponse.json({ error: "phone + text required" }, { status: 400 });
  }
  const r = await notifyCoach(phone, text, { urgent, channel });
  return NextResponse.json(r);
}
