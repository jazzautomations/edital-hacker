import { v } from "convex/values";
import { internalMutation, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { emailOfSession } from "./auth";
import { LIMITS, PERIOD, periodKey, planOf, type UsageKind } from "../lib/plans";

// Limites por plano. Consome primeiro a franquia do período, depois o crédito
// de pacote avulso. Recusa (ok:false) quando não tem nenhum dos dois.

const KINDS = ["coach_msg", "voice_min", "prospect", "agency_map", "sign_doc"] as const;
const kindV = v.union(...KINDS.map((k) => v.literal(k)));

async function state(ctx: QueryCtx | MutationCtx, profileId: Id<"profiles">, kind: UsageKind) {
  const p = await ctx.db.get(profileId);
  const limit = LIMITS[planOf(p?.plan)][kind];
  const period = periodKey(kind);
  const row = await ctx.db
    .query("usage")
    .withIndex("by_profile_kind_period", (q) => q.eq("profileId", profileId).eq("kind", kind).eq("period", period))
    .unique();
  const cred = await ctx.db.query("credits").withIndex("by_profile_kind", (q) => q.eq("profileId", profileId).eq("kind", kind)).unique();
  return { limit, used: row?.used ?? 0, row, period, credits: cred?.balance ?? 0, cred, plan: planOf(p?.plan) };
}

export async function consume(ctx: MutationCtx, profileId: Id<"profiles">, kind: UsageKind, amount = 1, allowPartial = false) {
  const s = await state(ctx, profileId, kind);
  const fromPlan = Math.max(0, Math.min(amount, s.limit - s.used));
  const rest = amount - fromPlan;
  if (rest > s.credits && !allowPartial) return { ok: false as const, used: s.used, limit: s.limit, credits: s.credits, plan: s.plan };
  const fromCredits = Math.min(rest, s.credits);
  if (fromPlan > 0) {
    if (s.row) await ctx.db.patch(s.row._id, { used: s.used + fromPlan });
    else await ctx.db.insert("usage", { profileId, kind, period: s.period, used: fromPlan });
  }
  if (fromCredits > 0 && s.cred) await ctx.db.patch(s.cred._id, { balance: s.credits - fromCredits });
  return { ok: true as const, used: s.used + fromPlan, limit: s.limit, credits: s.credits - fromCredits, plan: s.plan };
}

export async function remaining(ctx: QueryCtx | MutationCtx, profileId: Id<"profiles">, kind: UsageKind) {
  const s = await state(ctx, profileId, kind);
  return Math.max(0, s.limit - s.used) + s.credits;
}

export const consumeInternal = internalMutation({
  args: { profileId: v.id("profiles"), kind: kindV, amount: v.optional(v.number()) },
  handler: async (ctx, a) => await consume(ctx, a.profileId, a.kind, a.amount ?? 1),
});

/** Servidor do app (coach texto, voz). */
export const consumeFromServer = mutation({
  args: { secret: v.string(), profileId: v.id("profiles"), kind: kindV, amount: v.optional(v.number()) },
  handler: async (ctx, a) => {
    if (!process.env.NOTIFY_SECRET || a.secret !== process.env.NOTIFY_SECRET) throw new Error("não autorizado");
    return await consume(ctx, a.profileId, a.kind, a.amount ?? 1);
  },
});

// ───────── voz: mede o tempo de cada chamada no servidor ─────────

export const voiceStart = mutation({
  args: { secret: v.string(), profileId: v.id("profiles"), agentId: v.string(), mode: v.string() },
  handler: async (ctx, a) => {
    if (!process.env.NOTIFY_SECRET || a.secret !== process.env.NOTIFY_SECRET) throw new Error("não autorizado");
    await ctx.db.insert("voiceSessions", { agentId: a.agentId, profileId: a.profileId, mode: a.mode, startedAt: Date.now() });
  },
});

export const voiceRemaining = query({
  args: { secret: v.string(), profileId: v.id("profiles") },
  handler: async (ctx, a) => {
    if (!process.env.NOTIFY_SECRET || a.secret !== process.env.NOTIFY_SECRET) return 0;
    return await remaining(ctx, a.profileId, "voice_min");
  },
});

/** Ao desligar: cobra os minutos usados (arredonda pra cima), uma vez só. */
export const voiceEnd = mutation({
  args: { secret: v.string(), agentId: v.string() },
  handler: async (ctx, a) => {
    if (!process.env.NOTIFY_SECRET || a.secret !== process.env.NOTIFY_SECRET) throw new Error("não autorizado");
    const s = await ctx.db.query("voiceSessions").withIndex("by_agent", (q) => q.eq("agentId", a.agentId)).unique();
    if (!s || s.endedAt) return null;
    const now = Date.now();
    await ctx.db.patch(s._id, { endedAt: now });
    const min = Math.max(1, Math.ceil((now - s.startedAt) / 60_000));
    await consume(ctx, s.profileId, "voice_min", min, true);
    return { minutes: min, profileId: s.profileId };
  },
});

// ───────── tela: quanto já usou ─────────

export const mine = query({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    const email = await emailOfSession(ctx, a.token);
    if (!email) return null;
    const p = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).first();
    if (!p) return null;
    const out: Record<string, { used: number; limit: number; credits: number; period: string }> = {};
    for (const k of KINDS) {
      const s = await state(ctx, p._id, k);
      out[k] = { used: s.used, limit: s.limit, credits: s.credits, period: PERIOD[k] };
    }
    return { plan: planOf(p.plan), zap: LIMITS[planOf(p.plan)].zap, usage: out };
  },
});
