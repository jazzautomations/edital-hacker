import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("gigs")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect(),
});

export const add = mutation({
  args: {
    profileId: v.id("profiles"),
    leadId: v.optional(v.id("leads")),
    title: v.string(),
    venue: v.optional(v.string()),
    date: v.string(),
    fee: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await ctx.db.insert("gigs", { ...args, status: "marcado", createdAt: Date.now() }),
});

export const setStatus = mutation({
  args: { id: v.id("gigs"), status: v.string() },
  handler: async (ctx, args) => await ctx.db.patch(args.id, { status: args.status }),
});

export const remove = mutation({
  args: { id: v.id("gigs") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});
