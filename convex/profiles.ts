import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

export const getByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) =>
    await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique(),
});

export const list = query({
  handler: async (ctx) => await ctx.db.query("profiles").collect(),
});

export const getById = internalQuery({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

export const upsert = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    personType: v.string(),
    artAreas: v.array(v.string()),
    uf: v.optional(v.string()),
    bio: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    tagline: v.optional(v.string()),
    city: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    musicLinks: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return existing._id;
    }
    return await ctx.db.insert("profiles", { ...args, plan: "free", createdAt: Date.now() });
  },
});
