import { internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { v } from "convex/values";

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM ?? "Manager <manager@seu-dominio.com>",
      to,
      subject,
      html,
    }),
  });
  return { ok: res.ok, status: res.status };
}

export const recordAlert = internalMutation({
  args: { profileId: v.id("profiles"), opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("alertLog")
      .withIndex("by_profile_opp", (q) =>
        q.eq("profileId", args.profileId).eq("opportunityId", args.opportunityId)
      )
      .unique();
    if (seen) return false;
    await ctx.db.insert("alertLog", { ...args, sentAt: Date.now() });
    return true;
  },
});

export const run = internalAction({
  handler: async (ctx) => {
    const profiles = await ctx.runQuery(api.profiles.list, {});
    const now = new Date();
    const soon = new Date(now.getTime() + 14 * 24 * 3600 * 1000).toISOString();
    const sent: any[] = [];
    for (const profile of profiles) {
      const opps = (await ctx.runQuery(api.opportunities.list, { limit: 100 })).filter(
        (o: any) =>
          o.registrationTo &&
          o.registrationTo <= soon &&
          (profile.artAreas.length === 0 ||
            o.categories.some((c: string) =>
              profile.artAreas.some((a: string) => c.toLowerCase().includes(a.toLowerCase()))
            ))
      );
      const fresh = [];
      for (const o of opps) {
        if (await ctx.runMutation(internal.alerts.recordAlert, {
          profileId: profile._id,
          opportunityId: o._id,
        })) {
          fresh.push(o);
        }
      }
      if (fresh.length > 0) {
        const html = `<h2>Achei ${fresh.length} oportunidade(s) que aceitam você</h2>` +
          fresh.map((o) =>
            `<p><b>${o.name}</b> — ${o.sourceName}<br>Prazo: ${o.registrationTo?.slice(0, 10)} · ` +
            (o.totalResource ? `Até R$ ${o.totalResource.toLocaleString("pt-BR")} · ` : "") +
            `<a href="${o.sourceUrl}">Ver edital</a></p>`
          ).join("");
        const r = await sendEmail(
          profile.email,
          `${fresh.length} oportunidade(s) nova(s) pro seu perfil`,
          html
        );
        sent.push({ email: profile.email, count: fresh.length, ...r });
      }
    }
    return sent;
  },
});
