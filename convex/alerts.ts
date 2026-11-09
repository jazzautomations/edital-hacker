import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { sendEmail } from "../lib/resend";
import { personTypeMatches } from "../lib/types";

export const recordAlert = internalMutation({
  args: {
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    kind: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("alertLog")
      .withIndex("by_profile_opp", (q) =>
        q.eq("profileId", args.profileId).eq("opportunityId", args.opportunityId)
      )
      .collect();
    const kind = args.kind ?? "match";
    if (seen.some((s) => (s.kind ?? "match") === kind)) return false;
    await ctx.db.insert("alertLog", { ...args, kind, sentAt: Date.now() });
    return true;
  },
});

function matchesProfile(profile: any, o: any): boolean {
  if (!o.registrationTo) return false;
  const areasOk =
    profile.artAreas.length === 0 ||
    o.categories.some((c: string) =>
      profile.artAreas.some((a: string) =>
        c.toLowerCase().includes(a.toLowerCase())
      )
    );
  const typeOk = personTypeMatches(profile.personType, o.proponentTypes);
  return areasOk && typeOk;
}

export const run = internalAction({
  handler: async (ctx) => {
    const profiles = await ctx.runQuery(api.profiles.list, {});
    const now = Date.now();
    const in14d = new Date(now + 14 * 24 * 3600 * 1000).toISOString();
    const in3d = new Date(now + 3 * 24 * 3600 * 1000).toISOString();
    const sent: any[] = [];

    for (const profile of profiles) {
      const opps = (await ctx.runQuery(api.opportunities.list, { limit: 200 }))
        .filter((o: any) => o.registrationTo && o.registrationTo <= in14d && matchesProfile(profile, o));

      // 1) Match novo → email com oportunidades frescas
      const fresh = [];
      for (const o of opps) {
        if (await ctx.runMutation(internal.alerts.recordAlert, {
          profileId: profile._id, opportunityId: o._id, kind: "match",
        })) fresh.push(o);
      }
      if (fresh.length > 0) {
        const html = `<h2>Achei ${fresh.length} oportunidade(s) que aceitam você</h2>` +
          fresh.map((o: any) =>
            `<p><b>${o.name}</b> — ${o.sourceName}<br>Prazo: ${o.registrationTo?.slice(0, 10)} · ` +
            (o.totalResource ? `Até R$ ${o.totalResource.toLocaleString("pt-BR")} · ` : "") +
            `<a href="${o.sourceUrl}">Ver edital</a></p>`
          ).join("");
        const r = await sendEmail(profile.email, `${fresh.length} oportunidade(s) nova(s) pro seu perfil`, html);
        sent.push({ kind: "match", email: profile.email, count: fresh.length, ...r });
      }

      // 2) Pipeline items com prazo ≤3 dias → lembrete (dedup por kind)
      const items = await ctx.runQuery(api.pipeline.listForProfile, { profileId: profile._id });
      const urgent = items.filter(
        (i: any) => i.opportunity?.registrationTo && i.opportunity.registrationTo <= in3d &&
          ["interessado", "descoberta"].includes(i.stage)
      );
      for (const i of urgent) {
        if (await ctx.runMutation(internal.alerts.recordAlert, {
          profileId: profile._id, opportunityId: i.opportunityId, kind: "deadline",
        })) {
          const o = i.opportunity!;
          const r = await sendEmail(
            profile.email,
            `Faltam poucos dias: ${o.name}`,
            `<p>O edital <b>${o.name}</b> (${o.sourceName}) fecha inscrições em <b>${o.registrationTo?.slice(0, 10) ?? "em breve"}</b> e tá no seu pipeline.</p><p><a href="${o.sourceUrl}">Abrir edital</a></p>`
          );
          sent.push({ kind: "deadline", email: profile.email, opp: o.name, ...r });

          // Canal de bolso: WhatsApp (Evolution) → SMS → torpedo de voz se ≤3 dias.
          // A rota /api/notify roda no Next (Evolution tá na tailnet).
          if (profile.phone) {
            const msg =
              `⚡ Manager: faltam poucos dias pro edital ${o.name} (${o.sourceName}) — ` +
              `inscrições até ${o.registrationTo?.slice(0, 10) ?? "em breve"}. Abre no app e bora.`;
            const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
            if (appUrl) {
              const nr = await fetch(`${appUrl}/api/notify`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "x-notify-secret": process.env.NOTIFY_SECRET ?? "",
                },
                body: JSON.stringify({ phone: profile.phone, text: msg, urgent: true }),
              }).then((res) => res.json()).catch(() => null);
              sent.push({ kind: "deadline_phone", phone: profile.phone, channel: nr?.channel, opp: o.name });
            }
          }
        }
      }

      // 3) Documentos vencendo em ≤30 dias
      const expiring = await ctx.runQuery(api.documents.expiringDocs, {
        profileId: profile._id, withinDays: 30,
      });
      if (expiring.length > 0) {
        const r = await sendEmail(
          profile.email,
          `${expiring.length} documento(s) vencendo`,
          `<p>Renove antes do próximo edital:</p><ul>` +
          expiring.map((d: any) => `<li><b>${d.name}</b> — vence ${d.expiresAt?.slice(0, 10)}</li>`).join("") +
          `</ul>`
        );
        sent.push({ kind: "docs", email: profile.email, count: expiring.length, ...r });
      }
    }
    return sent;
  },
});
