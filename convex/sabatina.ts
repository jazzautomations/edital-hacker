import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TURN = v.object({ role: v.string(), text: v.string() });
const VERDICT = v.object({
  score: v.number(),
  summary: v.string(),
  gaps: v.array(v.string()),
  missingDocs: v.array(v.string()),
  warnings: v.optional(v.array(v.string())),
  injectionDetected: v.optional(v.boolean()),
});

export const save = mutation({
  args: {
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    turns: v.array(TURN),
    verdict: v.optional(VERDICT),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sabatinaSessions", {
      profileId: args.profileId,
      opportunityId: args.opportunityId,
      turns: args.turns,
      verdict: args.verdict,
      createdAt: Date.now(),
      completedAt: args.verdict ? Date.now() : undefined,
    });
  },
});

export const countForProfile = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("sabatinaSessions")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    return sessions.filter((s) => s.verdict).length;
  },
});
