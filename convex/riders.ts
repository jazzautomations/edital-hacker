import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MEMBER = v.object({
  position: v.string(),
  instrument: v.string(),
  vocals: v.optional(v.boolean()),
});
const INPUT = v.object({ channel: v.number(), source: v.string(), mic: v.string() });

export const listForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) =>
    await ctx.db
      .query("riders")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect(),
});

export const upsert = mutation({
  args: {
    id: v.optional(v.id("riders")),
    profileId: v.id("profiles"),
    name: v.string(),
    techContact: v.optional(v.string()),
    members: v.array(MEMBER),
    inputs: v.array(INPUT),
    monitors: v.optional(v.string()),
    backlineOwn: v.optional(v.string()),
    backlineVenue: v.optional(v.string()),
    hospitality: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...data } = args;
    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: Date.now() });
      return id;
    }
    return await ctx.db.insert("riders", { ...data, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { id: v.id("riders") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Contexto total do coach — o "RAG" do artista: tudo que o Manager sabe
// sobre a carreira dele, num payload só pro system prompt.
export const coachContext = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const [profile, pipeline, leads, gigs, docs, riders, sessions, contacts] = await Promise.all([
      ctx.db.get(args.profileId),
      ctx.db.query("pipelineItems").withIndex("by_profile", (q) => q.eq("profileId", args.profileId)).collect(),
      ctx.db.query("leads").withIndex("by_profile", (q) => q.eq("profileId", args.profileId)).collect(),
      ctx.db.query("gigs").withIndex("by_profile", (q) => q.eq("profileId", args.profileId)).collect(),
      ctx.db.query("documents").withIndex("by_profile", (q) => q.eq("profileId", args.profileId)).collect(),
      ctx.db.query("riders").withIndex("by_profile", (q) => q.eq("profileId", args.profileId)).collect(),
      ctx.db.query("sabatinaSessions").withIndex("by_profile", (q) => q.eq("profileId", args.profileId)).collect(),
      ctx.db.query("contacts").withIndex("by_profile", (q) => q.eq("profileId", args.profileId)).collect(),
    ]);
    const opps = await Promise.all(pipeline.map((i) => ctx.db.get(i.opportunityId)));
    const messages = await ctx.db
      .query("coachMessages")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    return {
      profile,
      pipeline: pipeline.map((i, n) => ({ ...i, opportunity: opps[n] })),
      leads, gigs, docs, riders, contacts,
      sabatinas: sessions.filter((s) => s.verdict).map((s) => ({
        score: s.verdict!.score, summary: s.verdict!.summary, at: s.createdAt,
      })),
      history: messages.slice(-20),
    };
  },
});

export const addMessage = mutation({
  args: { profileId: v.id("profiles"), role: v.string(), text: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("coachMessages", { ...args, createdAt: Date.now() });
  },
});
