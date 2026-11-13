import { v } from "convex/values";
import { PACKS, type PackId } from "../lib/plans";
import { action, internalMutation, internalQuery, query, type MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import {
  checkPix,
  createOneOffCheckout,
  createPixQr,
  createSubscriptionCheckout,
  isSandbox,
  simulatePixPayment,
  validTaxId,
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

// PIX inline: QR na tela do paywall, sem redirect.
// Preço do unlock vem de env (ABACATE_UNLOCK_PRICE_CENTS, default 990 = R$9,90).
export const pixUnlock = action({
  args: {
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    taxId: v.string(), // CPF/CNPJ de quem paga — o Pix exige e não pode ser inventado
  },
  handler: async (ctx, args) => {
    const profile = (await ctx.runQuery(internal.profiles.getById, { id: args.profileId })) as any;
    if (!profile) throw new Error("Perfil não encontrado");
    const taxId = validTaxId(args.taxId);
    if (!taxId) throw new Error("CPF inválido — confere os números");
    const amount = Number(process.env.ABACATE_UNLOCK_PRICE_CENTS ?? 990);
    const qr = await createPixQr({
      amount,
      description: "Manager - destrava edital",
      customer: { email: profile.email, name: profile.name, taxId },
    });
    await ctx.runMutation(internal.billing.recordPixCharge, {
      pixId: qr.id,
      profileId: args.profileId,
      opportunityId: args.opportunityId,
      amount,
    });
    return { pixId: qr.id, brCode: qr.brCode, brCodeBase64: qr.brCodeBase64, amount, sandbox: isSandbox() };
  },
});

/** Pacote avulso (+minutos de voz, +prospecções) no Pix. */
export const pixPack = action({
  args: { token: v.string(), pack: v.string(), taxId: v.string() },
  handler: async (ctx, args) => {
    const pack = PACKS[args.pack as PackId];
    if (!pack) throw new Error("Pacote não existe");
    const profile = (await ctx.runQuery(api.profiles.me, { token: args.token })) as any;
    if (!profile) throw new Error("Sessão expirada. Entra de novo.");
    const taxId = validTaxId(args.taxId);
    if (!taxId) throw new Error("CPF inválido — confere os números");
    const qr = await createPixQr({ amount: pack.cents, description: `Manager - ${pack.title}`, customer: { email: profile.email, name: profile.name, taxId } });
    await ctx.runMutation(internal.billing.recordPixCharge, { pixId: qr.id, profileId: profile._id, pack: args.pack, amount: pack.cents });
    return { pixId: qr.id, brCode: qr.brCode, brCodeBase64: qr.brCodeBase64, amount: pack.cents, sandbox: isSandbox() };
  },
});

export const recordPixCharge = internalMutation({
  args: { pixId: v.string(), profileId: v.id("profiles"), opportunityId: v.optional(v.id("opportunities")), pack: v.optional(v.string()), amount: v.number() },
  handler: async (ctx, a) => {
    await ctx.db.insert("pixCharges", { ...a, status: "PENDING", createdAt: Date.now() });
  },
});

export const getPixCharge = internalQuery({
  args: { pixId: v.string() },
  handler: async (ctx, a) =>
    await ctx.db.query("pixCharges").withIndex("by_pix", (q) => q.eq("pixId", a.pixId)).unique(),
});

// Idempotente: marca a cobrança paga e destrava o edital uma única vez.
async function doSettle(ctx: MutationCtx, a: { pixId: string; status: string }) {
    const charge = await ctx.db.query("pixCharges").withIndex("by_pix", (q) => q.eq("pixId", a.pixId)).unique();
    if (!charge) return { found: false };
    if (charge.status === "PAID") return { found: true, status: "PAID" };
    if (a.status !== "PAID") {
      if (charge.status !== a.status) await ctx.db.patch(charge._id, { status: a.status });
      return { found: true, status: a.status };
    }
    await ctx.db.patch(charge._id, { status: "PAID", paidAt: Date.now() });
    // pacote avulso: soma crédito
    if (charge.pack) {
      const pack = PACKS[charge.pack as PackId];
      if (pack) {
        const cur = await ctx.db.query("credits").withIndex("by_profile_kind", (q) => q.eq("profileId", charge.profileId).eq("kind", pack.kind)).unique();
        if (cur) await ctx.db.patch(cur._id, { balance: cur.balance + pack.amount });
        else await ctx.db.insert("credits", { profileId: charge.profileId, kind: pack.kind, balance: pack.amount });
      }
      return { found: true, status: "PAID" };
    }
    if (!charge.opportunityId) return { found: true, status: "PAID" };
    const opportunityId = charge.opportunityId;
    const already = await ctx.db
      .query("unlockedEdits")
      .withIndex("by_profile_opp", (q) => q.eq("profileId", charge.profileId).eq("opportunityId", opportunityId))
      .first();
    if (!already) {
      await ctx.db.insert("unlockedEdits", {
        profileId: charge.profileId,
        opportunityId,
        checkoutId: a.pixId,
        paidAt: Date.now(),
      });
    }
    return { found: true, status: "PAID" };
}

export const settlePixCharge = internalMutation({
  args: { pixId: v.string(), status: v.string() },
  handler: async (ctx, a) => await doSettle(ctx, a),
});

// A tela consulta isto enquanto o QR está aberto: confere na AbacatePay e,
// se pagou, destrava. Não depende do webhook chegar.
export const pixStatus = action({
  args: { pixId: v.string() },
  handler: async (ctx, args): Promise<{ status: string }> => {
    const charge = await ctx.runQuery(internal.billing.getPixCharge, { pixId: args.pixId });
    if (!charge) throw new Error("Cobrança não encontrada");
    if (charge.status === "PAID") return { status: "PAID" };
    const remote = await checkPix(args.pixId);
    const status = String(remote?.status ?? "PENDING").toUpperCase();
    await ctx.runMutation(internal.billing.settlePixCharge, { pixId: args.pixId, status });
    return { status };
  },
});

// Sandbox apenas: simula o pagamento (botão de teste e E2E).
export const pixSimulate = action({
  args: { pixId: v.string() },
  handler: async (ctx, args): Promise<{ status: string }> => {
    const charge = await ctx.runQuery(internal.billing.getPixCharge, { pixId: args.pixId });
    if (!charge) throw new Error("Cobrança não encontrada");
    await simulatePixPayment(args.pixId);
    return { status: "SIMULATED" };
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

    // Pix inline pago: o id do evento é o id da cobrança registrada em pixCharges.
    if (/^(transparent|pix|billing)\./.test(args.kind) && /(completed|paid)$/.test(args.kind) && d.id) {
      const r = await doSettle(ctx, { pixId: String(d.id), status: "PAID" });
      if (r.found) return { applied: "pix" };
    }

    return { ignored: args.kind };
  },
});
