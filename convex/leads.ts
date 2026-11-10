import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("leads")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect(),
});

export const upsert = internalMutation({
  args: {
    profileId: v.id("profiles"),
    name: v.string(),
    kind: v.optional(v.string()),
    city: v.optional(v.string()),
    uf: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    contact: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    const dup = existing.find(
      (l) => l.name.toLowerCase() === args.name.toLowerCase()
    );
    if (dup) {
      await ctx.db.patch(dup._id, {
        contact: args.contact ?? dup.contact,
        sourceUrl: args.sourceUrl ?? dup.sourceUrl,
        description: args.description ?? dup.description,
        updatedAt: Date.now(),
      });
      return dup._id;
    }
    return await ctx.db.insert("leads", {
      profileId: args.profileId,
      name: args.name,
      kind: args.kind ?? "outro",
      city: args.city,
      uf: args.uf,
      sourceUrl: args.sourceUrl,
      contact: args.contact,
      description: args.description,
      status: "novo",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const setStatus = mutation({
  args: { id: v.id("leads"), status: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: args.status, updatedAt: Date.now() });
    if (args.status === "fechado") {
      const lead = await ctx.db.get(args.id);
      if (lead) {
        const existing = await ctx.db
          .query("gigs")
          .withIndex("by_profile", (q) => q.eq("profileId", lead.profileId))
          .collect();
        if (!existing.some((g) => g.leadId === args.id)) {
          await ctx.db.insert("gigs", {
            profileId: lead.profileId,
            leadId: args.id,
            title: lead.name,
            venue: [lead.city, lead.uf].filter(Boolean).join("/") || undefined,
            date: new Date().toISOString().slice(0, 10),
            notes: "Fechado a partir do funil de prospecção",
            status: "marcado",
            createdAt: Date.now(),
          });
        }
      }
    }
  },
});

export const setDossier = internalMutation({
  args: { id: v.id("leads"), dossier: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { dossier: args.dossier, dossierAt: Date.now(), updatedAt: Date.now() });
  },
});

export const setNotes = mutation({
  args: { id: v.id("leads"), notes: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { notes: args.notes, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => await ctx.db.delete(args.id),
});
