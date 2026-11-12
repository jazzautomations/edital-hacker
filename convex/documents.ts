import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB por arquivo

export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const docs = await ctx.db
      .query("documents")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    return await Promise.all(
      docs.map(async (d) => ({
        ...d,
        url: d.storageId ? await ctx.storage.getUrl(d.storageId) : null,
      }))
    );
  },
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

/** URL de upload direto pro storage (o arquivo não passa pelo nosso servidor). */
export const generateUploadUrl = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Perfil não encontrado");
    return await ctx.storage.generateUploadUrl();
  },
});

export const add = mutation({
  args: {
    profileId: v.id("profiles"),
    name: v.string(),
    kind: v.string(),
    expiresAt: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.size && args.size > MAX_BYTES) {
      if (args.storageId) await ctx.storage.delete(args.storageId);
      throw new Error("Arquivo maior que 15 MB");
    }
    return await ctx.db.insert("documents", { ...args, createdAt: Date.now() });
  },
});

export const update = mutation({
  args: {
    id: v.id("documents"),
    name: v.optional(v.string()),
    kind: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...patch } = args;
    await ctx.db.patch(id, patch);
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.id);
    if (!doc) return;
    if (doc.storageId) await ctx.storage.delete(doc.storageId).catch(() => {});
    await ctx.db.delete(args.id);
  },
});
