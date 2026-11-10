import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Diário do Manager — cada ação do agente grava uma linha. O feed realtime
// é a prova do "trabalhou enquanto você dormia".

export const list = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) =>
    ctx.db
      .query("agentActivity")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .order("desc")
      .take(30),
});

export const log = mutation({
  args: {
    profileId: v.id("profiles"),
    verb: v.string(),
    detail: v.optional(v.string()),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    ctx.db.insert("agentActivity", { ...args, createdAt: Date.now() }),
});
