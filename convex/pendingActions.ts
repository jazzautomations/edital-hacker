import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Fila de propostas do agente — o reply-detect (e futuros loops) propõe,
// o artista confirma em /prospeccao. Nenhum stage move sem clique humano.

export const listPending = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) =>
    ctx.db
      .query("pendingActions")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId).eq("status", "pending"))
      .order("desc")
      .take(20),
});

export const propose = mutation({
  args: {
    profileId: v.id("profiles"),
    type: v.string(),
    label: v.string(),
    description: v.optional(v.string()),
    payload: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // evita duplicar proposta idêntica pendente
    const existing = await ctx.db
      .query("pendingActions")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId).eq("status", "pending"))
      .collect();
    if (existing.some((p) => p.label === args.label)) return null;
    return ctx.db.insert("pendingActions", { ...args, status: "pending", createdAt: Date.now() });
  },
});

export const apply = mutation({
  args: { id: v.id("pendingActions") },
  handler: async (ctx, args) => {
    const action = await ctx.db.get(args.id);
    if (!action || action.status !== "pending") return { ok: false };
    if (action.type === "move_lead_stage" && action.payload?.leadId && action.payload?.stage) {
      await ctx.db.patch(action.payload.leadId as any, {
        status: action.payload.stage,
        updatedAt: Date.now(),
      });
    }
    await ctx.db.patch(args.id, { status: "applied" });
    return { ok: true };
  },
});

export const dismiss = mutation({
  args: { id: v.id("pendingActions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "dismissed" });
  },
});
