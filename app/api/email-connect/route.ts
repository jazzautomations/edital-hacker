import { NextResponse } from "next/server";
import { calendarConfigured, calendarStatus, composioConfigured, enableGmailTrigger, gmailStatus, linkCalendar, linkGmail } from "@/lib/composio";

// Conexão Gmail via Composio OAuth managed. O artista clica "Conectar Gmail"
// → devolvemos a redirect_url → ele autoriza → volta com callback.

export async function POST(req: Request) {
  const { email, action = "status" } = (await req.json()) as { email: string; action?: string };
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
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
