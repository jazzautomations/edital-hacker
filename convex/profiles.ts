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

// INTERNA: devolve todos os perfis (e-mail, telefone). Era pública — qualquer
// visitante listava a base inteira. Só as rotinas agendadas usam.
export const list = internalQuery({
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
    goals: v.optional(v.array(v.string())),
    onboarded: v.optional(v.boolean()),
  },
  handler: async (ctx, { onboarded, ...args }) => {
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    const stamp = onboarded ? { onboardedAt: Date.now() } : {};
    if (existing) {
      // não apaga o que já existe quando um formulário manda campo vazio
      const patch = Object.fromEntries(
        Object.entries(args).filter(([, val]) => val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0))
      );
      await ctx.db.patch(existing._id, { ...patch, ...(existing.onboardedAt ? {} : stamp) });
      return existing._id;
    }
    return await ctx.db.insert("profiles", { ...args, ...stamp, plan: "free", createdAt: Date.now() });
  },
});
