import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { emailOfSession } from "./auth";

/** Grava a transcrição de uma chamada de voz. Só o dono da sessão grava no próprio perfil. */
export const saveCall = mutation({
  args: {
    token: v.string(),
    mode: v.string(),
    opportunityId: v.optional(v.id("opportunities")),
    turns: v.array(v.object({ role: v.string(), text: v.string() })),
  },
  handler: async (ctx, args) => {
    const email = await emailOfSession(ctx, args.token);
    if (!email) throw new Error("sessão inválida");
    const profile = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).first();
    if (!profile) throw new Error("perfil não encontrado");
    const turns = args.turns
      .filter((t) => t.text.trim())
      .map((t) => ({ role: t.role === "user" ? "user" : "assistant", text: t.text.trim().slice(0, 4000) }))
      .slice(0, 400);
    if (!turns.some((t) => t.role === "user")) return null; // ligou e não falou nada
    const now = Date.now();
    const id = await ctx.db.insert("voiceCalls", {
      profileId: profile._id,
      mode: args.mode === "sabatina" ? "sabatina" : "coach",
      opportunityId: args.opportunityId,
      turns,
      createdAt: now,
    });
    // chamada com o coach entra na mesma conversa do chat: ele lembra depois
    if (args.mode !== "sabatina") {
      let i = 0;
      for (const t of turns) {
        await ctx.db.insert("coachMessages", { profileId: profile._id, role: t.role, text: t.text, via: "voz", createdAt: now + i++ });
      }
    }
    return id;
  },
});

export const listCalls = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const email = await emailOfSession(ctx, args.token);
    if (!email) return [];
    const profile = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).first();
    if (!profile) return [];
    const calls = await ctx.db.query("voiceCalls").withIndex("by_profile", (q) => q.eq("profileId", profile._id)).order("desc").take(30);
    return await Promise.all(
      calls.map(async (c) => ({
        ...c,
        opportunityName: c.opportunityId ? ((await ctx.db.get(c.opportunityId))?.name ?? null) : null,
      }))
    );
  },
});
