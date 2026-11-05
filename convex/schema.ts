import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  opportunities: defineTable({
    source: v.string(),
    sourceName: v.string(),
    externalId: v.string(),
    name: v.string(),
    shortDescription: v.optional(v.string()),
    kind: v.optional(v.string()),
    registrationFrom: v.optional(v.string()),
    registrationTo: v.optional(v.string()),
    proponentTypes: v.array(v.string()),
    categories: v.array(v.string()),
    totalResource: v.optional(v.number()),
    vacancies: v.optional(v.number()),
    registrationLimitPerOwner: v.optional(v.number()),
    ownerName: v.optional(v.string()),
    sourceUrl: v.string(),
    status: v.string(),
    rawMarkdown: v.optional(v.string()),
    enriched: v.optional(
      v.object({
        summary: v.optional(v.string()),
        eligibility: v.optional(v.string()),
        disqualifiers: v.array(v.string()),
        requiredDocs: v.array(v.string()),
        rubric: v.array(v.object({ criterion: v.string(), weight: v.optional(v.string()) })),
        deadlines: v.array(v.object({ label: v.string(), date: v.string() })),
      })
    ),
    lastSeenAt: v.number(),
  })
    .index("by_source_external", ["source", "externalId"])
    .index("by_deadline", ["registrationTo"])
    .index("by_status", ["status"]),

  profiles: defineTable({
    name: v.string(),
    email: v.string(),
    personType: v.string(),
    artAreas: v.array(v.string()),
    uf: v.optional(v.string()),
    bio: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    plan: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  pipelineItems: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    stage: v.string(),
    notes: v.optional(v.string()),
    sabatinaScore: v.optional(v.number()),
    sabatinaSummary: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_stage", ["profileId", "stage"])
    .index("by_profile_opp", ["profileId", "opportunityId"]),

  contacts: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    role: v.optional(v.string()),
    org: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_profile", ["profileId"]),

  documents: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    kind: v.string(),
    expiresAt: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
  }).index("by_profile", ["profileId"]),

  alertLog: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    kind: v.optional(v.string()),
    sentAt: v.number(),
  }).index("by_profile_opp", ["profileId", "opportunityId"]),

  sabatinaSessions: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    turns: v.array(v.object({ role: v.string(), text: v.string() })),
    verdict: v.optional(
      v.object({
        score: v.number(),
        summary: v.string(),
        gaps: v.array(v.string()),
        missingDocs: v.array(v.string()),
        warnings: v.optional(v.array(v.string())),
        injectionDetected: v.optional(v.boolean()),
      })
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_profile", ["profileId"]),

  subscriptions: defineTable({
    profileId: v.id("profiles"),
    abacateId: v.string(),
    checkoutId: v.optional(v.string()),
    plan: v.string(),
    cycle: v.optional(v.string()),
    status: v.string(),
    updatedAt: v.number(),
  }).index("by_profile", ["profileId"]),

  unlockedEdits: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    checkoutId: v.string(),
    paidAt: v.number(),
  }).index("by_profile_opp", ["profileId", "opportunityId"]),

  webhookLog: defineTable({
    eventId: v.string(),
    kind: v.string(),
    processedAt: v.number(),
  }).index("by_event", ["eventId"]),
});
