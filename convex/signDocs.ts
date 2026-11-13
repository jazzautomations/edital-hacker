import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { emailOfSession } from "./auth";
import { internal } from "./_generated/api";
import { consume } from "./usage";

function newToken(): string {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

async function ownerProfile(ctx: QueryCtx | MutationCtx, token: string) {
  const email = await emailOfSession(ctx, token);
  if (!email) return null;
  return await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).first();
}

const signerIn = v.object({ name: v.string(), role: v.optional(v.string()), phone: v.optional(v.string()) });

async function insertDoc(
  ctx: MutationCtx,
  profileId: Id<"profiles">,
  a: { title: string; body: string; sequential: boolean; deadline?: string; opportunityId?: Id<"opportunities">; signers: { name: string; role?: string; phone?: string }[] }
) {
  const signers = a.signers
    .filter((s) => s.name.trim())
    .slice(0, 30)
    .map((s, i) => ({
      name: s.name.trim().slice(0, 120),
      role: s.role?.trim().slice(0, 80) || undefined,
      phone: s.phone?.replace(/\D/g, "").slice(0, 15) || undefined,
      order: i + 1,
      token: newToken(),
      status: "pendente",
    }));
  if (!signers.length) throw new Error("precisa de pelo menos 1 pessoa pra assinar");
  const q = await consume(ctx, profileId, "sign_doc");
  if (!q.ok) throw new Error(`Limite do plano: ${q.limit} documento(s) pra assinar por mês. Sobe de plano em /assinatura.`);
  const id = await ctx.db.insert("signDocs", {
    profileId,
    opportunityId: a.opportunityId,
    title: a.title.trim().slice(0, 200) || "Documento",
    body: a.body.slice(0, 40000),
    sequential: a.sequential,
    deadline: a.deadline && /^\d{4}-\d{2}-\d{2}$/.test(a.deadline) ? a.deadline : undefined,
    signers,
    createdAt: Date.now(),
  });
  for (const s of signers) await ctx.db.insert("signLinks", { token: s.token, docId: id, order: s.order });
  return { id, signers: signers.map((s) => ({ name: s.name, phone: s.phone, order: s.order, token: s.token })) };
}

/** Criado pela tela, com a sessão do artista. */
export const create = mutation({
  args: {
    token: v.string(),
    title: v.string(),
    body: v.string(),
    sequential: v.boolean(),
    deadline: v.optional(v.string()),
    opportunityId: v.optional(v.id("opportunities")),
    signers: v.array(signerIn),
  },
  handler: async (ctx, a) => {
    const p = await ownerProfile(ctx, a.token);
    if (!p) throw new Error("sessão inválida");
    return await insertDoc(ctx, p._id, a);
  },
});

/** Criado pelo coach no servidor do app. */
export const createFromServer = mutation({
  args: {
    secret: v.string(),
    profileId: v.id("profiles"),
    title: v.string(),
    body: v.string(),
    sequential: v.boolean(),
    deadline: v.optional(v.string()),
    opportunityId: v.optional(v.id("opportunities")),
    signers: v.array(signerIn),
  },
  handler: async (ctx, a) => {
    if (!process.env.NOTIFY_SECRET || a.secret !== process.env.NOTIFY_SECRET) throw new Error("não autorizado");
    const { secret: _s, profileId, ...rest } = a;
    return await insertDoc(ctx, profileId, rest);
  },
});

export const listMine = query({
  args: { token: v.string() },
  handler: async (ctx, a) => {
    const p = await ownerProfile(ctx, a.token);
    if (!p) return [];
    const docs = await ctx.db.query("signDocs").withIndex("by_profile", (q) => q.eq("profileId", p._id)).order("desc").take(50);
    return docs.map((d) => ({
      _id: d._id,
      title: d.title,
      sequential: d.sequential,
      deadline: d.deadline,
      createdAt: d.createdAt,
      signers: d.signers.map((s) => ({ name: s.name, role: s.role, phone: s.phone, order: s.order, token: s.token, status: s.status, signedAt: s.signedAt })),
    }));
  },
});

export const remove = mutation({
  args: { token: v.string(), id: v.id("signDocs") },
  handler: async (ctx, a) => {
    const p = await ownerProfile(ctx, a.token);
    const d = await ctx.db.get(a.id);
    if (!p || !d || d.profileId !== p._id) throw new Error("não encontrado");
    for (const s of d.signers) {
      const l = await ctx.db.query("signLinks").withIndex("by_token", (q) => q.eq("token", s.token)).unique();
      if (l) await ctx.db.delete(l._id);
    }
    await ctx.db.delete(a.id);
  },
});

async function byLink(ctx: QueryCtx | MutationCtx, token: string) {
  if (!/^[a-f0-9]{36}$/.test(token)) return null;
  const l = await ctx.db.query("signLinks").withIndex("by_token", (q) => q.eq("token", token)).unique();
  if (!l) return null;
  const d = await ctx.db.get(l.docId);
  if (!d) return null;
  const me = d.signers.find((s) => s.token === token);
  return me ? { d, me } : null;
}

/** O que quem recebeu o link vê: o documento, a vez dele e quem já assinou (sem dados dos outros). */
export const forSigner = query({
  args: { link: v.string() },
  handler: async (ctx, a) => {
    const r = await byLink(ctx, a.link);
    if (!r) return null;
    const { d, me } = r;
    const owner = await ctx.db.get(d.profileId);
    const waitingFor = d.sequential ? d.signers.filter((s) => s.order < me.order && s.status !== "assinado").map((s) => s.name) : [];
    return {
      title: d.title,
      body: d.body,
      deadline: d.deadline,
      from: owner?.name ?? "",
      me: { name: me.name, role: me.role, status: me.status, cpf: me.cpf, rg: me.rg, address: me.address, signedAt: me.signedAt },
      waitingFor,
      people: d.signers.map((s) => ({ name: s.name, role: s.role, order: s.order, status: s.status })),
      sequential: d.sequential,
    };
  },
});

export const sign = mutation({
  args: { link: v.string(), cpf: v.string(), rg: v.optional(v.string()), address: v.optional(v.string()), signature: v.string() },
  handler: async (ctx, a) => {
    const r = await byLink(ctx, a.link);
    if (!r) throw new Error("link inválido");
    const { d, me } = r;
    if (me.status === "assinado") return { ok: true };
    if (d.sequential && d.signers.some((s) => s.order < me.order && s.status !== "assinado")) {
      throw new Error("ainda não é tua vez: falta alguém antes de você assinar");
    }
    const cpf = a.cpf.replace(/\D/g, "");
    if (cpf.length !== 11) throw new Error("CPF precisa ter 11 números");
    if (!a.signature.startsWith("data:image/png;base64,") || a.signature.length > 300_000) throw new Error("assinatura inválida");
    const signers = d.signers.map((s) =>
      s.token === me.token
        ? { ...s, status: "assinado", cpf, rg: a.rg?.trim().slice(0, 30) || undefined, address: a.address?.trim().slice(0, 300) || undefined, signature: a.signature, signedAt: Date.now() }
        : s
    );
    await ctx.db.patch(d._id, { signers });
    await ctx.scheduler.runAfter(0, internal.zap.afterSign, { docId: d._id }); // avisa o próximo no zap
    return { ok: true };
  },
});

/** Dados completos pro PDF: só o dono (sessão) ou quem tem um link do documento. */
export const forPdf = query({
  args: { id: v.optional(v.id("signDocs")), token: v.optional(v.string()), link: v.optional(v.string()) },
  handler: async (ctx, a) => {
    let d = null;
    if (a.link) d = (await byLink(ctx, a.link))?.d ?? null;
    else if (a.id && a.token) {
      const p = await ownerProfile(ctx, a.token);
      const doc = await ctx.db.get(a.id);
      if (p && doc && doc.profileId === p._id) d = doc;
    }
    if (!d) return null;
    const owner = await ctx.db.get(d.profileId);
    return {
      title: d.title,
      body: d.body,
      from: owner?.name ?? "",
      createdAt: d.createdAt,
      signers: d.signers.map((s) => ({ name: s.name, role: s.role, order: s.order, status: s.status, cpf: s.cpf, rg: s.rg, address: s.address, signature: s.signature, signedAt: s.signedAt })),
    };
  },
});

export const listForServer = query({
  args: { secret: v.string(), profileId: v.id("profiles") },
  handler: async (ctx, a) => {
    if (!process.env.NOTIFY_SECRET || a.secret !== process.env.NOTIFY_SECRET) return [];
    const docs = await ctx.db.query("signDocs").withIndex("by_profile", (q) => q.eq("profileId", a.profileId)).order("desc").take(20);
    return docs.map((d) => ({ _id: d._id, title: d.title }));
  },
});
