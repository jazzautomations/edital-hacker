import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("documents")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect(),
});

export const expiringDocs = query({
  args: { profileId: v.id("profiles"), withinDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = new Date(
      Date.now() + (args.withinDays ?? 30) * 24 * 3600 * 1000
    ).toISOString();
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    return docs.filter((d) => d.expiresAt && d.expiresAt <= limit);
  },
});

export const add = mutation({
  args: {
    profileId: v.id("profiles"),
    name: v.string(),
    kind: v.string(),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => await ctx.db.insert("documents", args),
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    name: v.optional(v.string()),
    kind: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});
