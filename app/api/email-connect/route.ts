import { NextResponse } from "next/server";
import { composioConfigured, gmailStatus, linkGmail } from "@/lib/composio";

// Conexão Gmail via Composio OAuth managed. O artista clica "Conectar Gmail"
// → devolvemos a redirect_url → ele autoriza → volta com callback.

export async function POST(req: Request) {
  const { email, action = "status" } = (await req.json()) as { email: string; action?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  if (!composioConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  if (action === "initiate") {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const { redirectUrl, error } = await linkGmail(email, `${appUrl}/coach?gmail=connected`);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ configured: true, redirectUrl });
  }

  const st = await gmailStatus(email);
  return NextResponse.json({ configured: true, ...st });
}
