import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const STAGES = [
  "descoberta",
  "interessado",
  "inscrito",
  "ganho",
  "execucao",
  "prestacao",
  "arquivado",
] as const;

export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("pipelineItems")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    const withOpp = await Promise.all(
      items.map(async (i) => ({ ...i, opportunity: await ctx.db.get(i.opportunityId) }))
    );
    return withOpp.filter((i) => i.opportunity !== null);
  },
});

export const add = mutation({
  args: {
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pipelineItems")
      .withIndex("by_profile_opp", (q) =>
        q.eq("profileId", args.profileId).eq("opportunityId", args.opportunityId)
      )
      .unique();
    if (existing) return existing._id;
    return await ctx.db.insert("pipelineItems", {
      profileId: args.profileId,
      opportunityId: args.opportunityId,
      stage: args.stage ?? "interessado",
      updatedAt: Date.now(),
    });
  },
});

export const move = mutation({
  args: { id: v.id("pipelineItems"), stage: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { stage: args.stage, updatedAt: Date.now() });
  },
});

export const setSabatinaResult = mutation({
  args: {
    id: v.id("pipelineItems"),
    sabatinaScore: v.number(),
    sabatinaSummary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      sabatinaScore: args.sabatinaScore,
      sabatinaSummary: args.sabatinaSummary,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("pipelineItems") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/** Grava o checklist de inscrição (servidor do app, com o segredo). Põe o edital no pipeline se ainda não estiver. */
export const setChecklist = mutation({
  args: {
    secret: v.string(),
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    checklist: v.array(v.object({ item: v.string(), status: v.string(), doc: v.optional(v.string()), hint: v.optional(v.string()) })),
  },
  handler: async (ctx, args) => {
    if (!process.env.NOTIFY_SECRET || args.secret !== process.env.NOTIFY_SECRET) throw new Error("não autorizado");
    const existing = await ctx.db
      .query("pipelineItems")
      .withIndex("by_profile_opp", (q) => q.eq("profileId", args.profileId).eq("opportunityId", args.opportunityId))
      .unique();
    const patch = { checklist: args.checklist, checklistAt: Date.now(), updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("pipelineItems", { profileId: args.profileId, opportunityId: args.opportunityId, stage: "interessado", ...patch });
  },
});
