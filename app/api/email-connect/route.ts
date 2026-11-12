import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { calendarConfigured, calendarStatus, composioConfigured, enableGmailTrigger, gmailStatus, linkCalendar, linkGmail } from "@/lib/composio";

// Conexão Gmail via Composio OAuth managed. O artista clica "Conectar Gmail"
// → devolvemos a redirect_url → ele autoriza → volta com callback.

export async function POST(req: Request) {
  const { token, action = "status" } = (await req.json()) as { token: string; action?: string };
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });
  // o e-mail vem da sessão: ninguém consulta nem conecta a caixa de outra pessoa
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const me = (await convex.query(api.auth.me, { token })) as { email: string } | null;
  if (!me) return NextResponse.json({ error: "sessão inválida" }, { status: 401 });
  const email = me.email;
  if (!composioConfigured()) {
    return NextResponse.json({ configured: false, connected: false });
  }

  if (action === "initiate" || action === "initiate_calendar") {
    const appUrl = process.env.APP_URL ?? "http://localhost:3000";
    const cb = `${appUrl}/coach?${action === "initiate" ? "gmail" : "calendar"}=connected`;
    const { redirectUrl, error } =
      action === "initiate" ? await linkGmail(email, cb) : await linkCalendar(email, cb);
    if (error) return NextResponse.json({ error }, { status: 502 });
    return NextResponse.json({ configured: true, redirectUrl });
  }

  const st = await gmailStatus(email);
  // conectou? liga o trigger quase-tempo-real (upsert idempotente, fire-and-forget)
  if (st.connected) enableGmailTrigger(email).catch(() => {});
  const cal = calendarConfigured() ? await calendarStatus(email) : false;
  return NextResponse.json({ configured: true, calendarConfigured: calendarConfigured(), ...st, calendar: cal });
}
