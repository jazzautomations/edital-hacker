import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { sendBatch, type EmailItem } from "../lib/resend";

// Digest de segunda-feira — o "check-in semanal" do coach por email.
// Ritual que a mentoria cobra milhares: números da semana, prazos, follow-ups.
export const run = internalAction({
  handler: async (ctx) => {
    const profiles = await ctx.runQuery(api.profiles.list, {});
    const now = Date.now();
    const in7d = new Date(now + 7 * 24 * 3600 * 1000).toISOString();
    const today = new Date(now).toISOString().slice(0, 10);
    const items: EmailItem[] = [];
    const report: any[] = [];

    for (const profile of profiles) {
      const [pipeline, leads, gigs] = await Promise.all([
        ctx.runQuery(api.pipeline.listForProfile, { profileId: profile._id }),
        ctx.runQuery(api.leads.listForProfile, { profileId: profile._id }),
        ctx.runQuery(api.gigs.listForProfile, { profileId: profile._id }),
      ]);

      const deadlines = pipeline.filter(
        (i: any) => i.opportunity?.registrationTo && i.opportunity.registrationTo <= in7d &&
          i.opportunity.registrationTo >= today && i.stage !== "submetida" && i.stage !== "descartada"
      );
      const staleLeads = leads.filter(
        (l: any) => ["novo", "contatado", "respondeu"].includes(l.status) &&
          l.updatedAt < now - 5 * 24 * 3600 * 1000
      );
      const weekGigs = gigs.filter((g: any) => g.date >= today && g.date <= in7d && g.status !== "cancelado");
      const aReceber = gigs
        .filter((g: any) => g.fee && g.status !== "pago" && g.status !== "cancelado")
        .reduce((s: number, g: any) => s + (g.fee ?? 0), 0);

      if (!deadlines.length && !staleLeads.length && !weekGigs.length && !aReceber) continue;

      const html =
        `<h2>⚡ Sua semana, ${profile.name.split(" ")[0]}</h2>` +
        (weekGigs.length
          ? `<h3>🎤 Trampo da semana</h3><ul>${weekGigs.map((g: any) =>
              `<li><b>${g.date}</b> — ${g.title}${g.venue ? ` · ${g.venue}` : ""}${g.fee ? ` · R$ ${g.fee.toLocaleString("pt-BR")}` : ""}</li>`
            ).join("")}</ul>`
          : "") +
        (aReceber
          ? `<p>💰 <b>R$ ${aReceber.toLocaleString("pt-BR")}</b> a receber — confere a agenda e cobra o que tá pendente.</p>`
          : "") +
        (deadlines.length
          ? `<h3>⏰ Prazos na semana</h3><ul>${deadlines.map((i: any) =>
              `<li><b>${i.opportunity.name}</b> — fecha ${i.opportunity.registrationTo?.slice(0, 10)} · <a href="${i.opportunity.sourceUrl}">edital</a></li>`
            ).join("")}</ul>`
          : "") +
        (staleLeads.length
          ? `<h3>📞 Follow-up pendente</h3><ul>${staleLeads.map((l: any) =>
              `<li><b>${l.name}</b> — ${l.status}, parado há ${Math.floor((now - l.updatedAt) / 86400000)} dias</li>`
            ).join("")}</ul>`
          : "") +
        `<p style="color:#666;font-size:12px">Enviado pelo Manager — o coach de IA do trabalhador da arte</p>`;

      items.push({ to: profile.email, subject: "⚡ Sua semana no Manager", html });
      report.push({ email: profile.email, gigs: weekGigs.length, deadlines: deadlines.length, stale: staleLeads.length });
    }

    const week = new Date(now).toISOString().slice(0, 10);
    const result = await sendBatch(items, `weekly-digest-${week}`);
    return { sent: items.length, result, report };
  },
});
