import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createOneOffCheckout,
  createPixQr,
  createSubscriptionCheckout,
} from "../lib/abacatepay";

const PRODUCT_ENV: Record<string, string | undefined> = {
  "manager:MONTHLY": process.env.ABACATE_PRODUCT_MANAGER_MONTHLY,
  "manager:ANNUALLY": process.env.ABACATE_PRODUCT_MANAGER_ANNUAL,
  "manager_pro:MONTHLY": process.env.ABACATE_PRODUCT_PRO_MONTHLY,
  "manager_pro:ANNUALLY": process.env.ABACATE_PRODUCT_PRO_ANNUAL,
};

export const planStatus = query({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, args) => {
    const profile = await ctx.db.get(args.profileId);
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    const activeSub = sub.find((s) => s.status === "ACTIVE");
    const unlocks = await ctx.db
      .query("unlockedEdits")
      .withIndex("by_profile_opp", (q) => q.eq("profileId", args.profileId))
      .collect();
    const sessions = await ctx.db
      .query("sabatinaSessions")
      .withIndex("by_profile", (q) => q.eq("profileId", args.profileId))
      .collect();
    return {
      plan: profile?.plan ?? "free",
      activeSubscription: activeSub ?? null,
      unlockedOpportunityIds: unlocks.map((u) => u.opportunityId),
      sabatinaCount: sessions.filter((s) => s.verdict).length,
    };
  },
});

export const subscribe = action({
  args: {
    profileId: v.id("profiles"),
    plan: v.string(),
    cycle: v.string(),
    returnUrl: v.string(),
    completionUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const productId = PRODUCT_ENV[`${args.plan}:${args.cycle}`];
    if (!productId) throw new Error(`Produto não configurado: ${args.plan} ${args.cycle}`);
    return await createSubscriptionCheckout({
      productId,
      externalId: args.profileId,
      returnUrl: args.returnUrl,
      completionUrl: args.completionUrl,
    });
  },
});

export const unlockEdital = action({
  args: {
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    returnUrl: v.string(),
    completionUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const productId = process.env.ABACATE_PRODUCT_UNLOCK;
    if (!productId) throw new Error("Produto UNLOCK não configurado");
    return await createOneOffCheckout({
      productId,
      externalId: `unlock:${args.profileId}:${args.opportunityId}`,
      returnUrl: args.returnUrl,
      completionUrl: args.completionUrl,
    });
  },
});

// PIX inline: QR na tela do paywall — sem redirect (cena do vídeo).
// Preço do unlock vem de env (ABACATE_UNLOCK_PRICE_CENTS, default 990 = R$9,90).
export const pixUnlock = action({
  args: { profileId: v.id("profiles"), opportunityId: v.id("opportunities") },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.profiles.getById, {
      id: args.profileId,
    });
    if (!profile) throw new Error("Perfil não encontrado");
    const amount = Number(process.env.ABACATE_UNLOCK_PRICE_CENTS ?? 990);
    const qr = await createPixQr({
      amount,
      description: "Manager — destrava edital",
      expiresIn: 3600,
      customer: { email: (profile as any).email, name: (profile as any).name },
    });
    return {
      pixId: qr.id,
      brCode: qr.brCode,
      brCodeBase64: qr.brCodeBase64,
      amount,
      externalId: `unlock:${args.profileId}:${args.opportunityId}`,
    };
  },
});

// Idempotente via webhookLog — chamado pelo http.ts
export const applyEvent = internalMutation({
  args: { eventId: v.string(), kind: v.string(), data: v.any() },
  handler: async (ctx, args) => {
    const seen = await ctx.db
      .query("webhookLog")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .unique();
    if (seen) return { duplicate: true };
    await ctx.db.insert("webhookLog", {
      eventId: args.eventId,
      kind: args.kind,
      processedAt: Date.now(),
    });

    const d = args.data ?? {};
    const externalId: string | undefined = d.externalId;

    if (args.kind.startsWith("subscription.")) {
      const profileId = externalId as any;
      const profile = (profileId ? await ctx.db.get(profileId) : null) as any;
      if (!profile || !("plan" in profile)) return { ignored: "unknown externalId" };
      const active =
        args.kind === "subscription.cancelled" ? "CANCELLED"
        : args.kind === "subscription.payment_failed" ? "PAST_DUE"
        : "ACTIVE";
      const existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_profile", (q) => q.eq("profileId", profileId))
        .collect();
      const mine = existing.find((s) => s.abacateId === d.id);
      const rec = {
        profileId,
        abacateId: String(d.id ?? ""),
        checkoutId: d.checkoutId ? String(d.checkoutId) : undefined,
        plan: profile.plan === "free" ? "manager" : profile.plan,
        cycle: d.cycle ? String(d.cycle) : undefined,
        status: active,
        updatedAt: Date.now(),
      };
      if (mine) await ctx.db.patch(mine._id, rec);
      else await ctx.db.insert("subscriptions", rec);
      await ctx.db.patch(profileId, {
        plan: active === "ACTIVE" ? rec.plan : active === "CANCELLED" ? "free" : profile.plan,
      });
      return { applied: args.kind, status: active };
    }

    if (args.kind === "checkout.completed" && externalId?.startsWith("unlock:")) {
      const [, profileId, opportunityId] = externalId.split(":");
      await ctx.db.insert("unlockedEdits", {
        profileId: profileId as any,
        opportunityId: opportunityId as any,
        checkoutId: String(d.id ?? ""),
        paidAt: Date.now(),
      });
      return { applied: "unlock" };
    }

    return { ignored: args.kind };
  },
});
