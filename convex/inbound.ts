import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Resend inbound (email.received): resposta do contratante cai direto no nosso
// webhook — reply-detect sem depender do Gmail do usuário (sponsor puro).
// Casa o remetente com contato/lead e propõe o move no funil.
export const handleInbound = internalMutation({
  args: {
    from: v.string(),
    subject: v.string(),
    snippet: v.string(),
  },
  handler: async (ctx, args) => {
    const from = args.from.toLowerCase();
    const emailMatch = from.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/)?.[0];
    if (!emailMatch) return { matched: false };

    // 1) lead cujo campo contact contém o remetente (match mais forte)
    const leads = await ctx.db.query("leads").collect();
    const lead = leads.find((l) =>
      (l.contact ?? "").toLowerCase().includes(emailMatch)
    );
    if (lead) {
      await ctx.db.insert("pendingActions", {
        profileId: lead.profileId,
        type: "move_lead_stage",
        label: `${lead.name} respondeu seu email — mover pra "respondeu"?`,
        description: `"${args.subject}" · ${args.snippet.slice(0, 200)}`,
        payload: { leadId: lead._id, stage: "respondeu", from: emailMatch },
        status: "pending",
        createdAt: Date.now(),
      });
      await ctx.db.insert("agentActivity", {
        profileId: lead.profileId,
        verb: "recebeu resposta de lead",
        detail: `${lead.name} <${emailMatch}> — ${args.subject}`,
        result: "proposta",
        createdAt: Date.now(),
      });
      return { matched: true, kind: "lead", name: lead.name };
    }

    // 2) contato OSINT conhecido (sem lead atrelado ainda)
    const contacts = await ctx.db.query("contacts").collect();
    const contact = contacts.find(
      (c) => (c.email ?? "").toLowerCase() === emailMatch
    );
    if (contact) {
      await ctx.db.insert("agentActivity", {
        profileId: contact.profileId,
        verb: "recebeu email de contato",
        detail: `${contact.name}${contact.org ? ` (${contact.org})` : ""} — ${args.subject}`,
        result: "ok",
        createdAt: Date.now(),
      });
      return { matched: true, kind: "contact", name: contact.name };
    }

    return { matched: false, from: emailMatch };
  },
});
