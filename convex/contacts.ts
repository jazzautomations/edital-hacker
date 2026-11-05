import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("contacts")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect(),
});

export const add = mutation({
  args: {
    profileId: v.id("profiles"),
    name: v.string(),
    role: v.optional(v.string()),
    org: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => await ctx.db.insert("contacts", args),
});

export const remove = mutation({
  args: { id: v.id("contacts") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});
