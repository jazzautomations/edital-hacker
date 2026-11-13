import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalQuery, mutation, query } from "./_generated/server";
import { emailOfSession } from "./auth";

/** O perfil de quem está logado. A sessão (token) é a única prova aceita. */
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const email = await emailOfSession(ctx, args.token);
    if (!email) return null;
    return await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).unique();
  },
});

/** Busca por e-mail só pro servidor do app (webhooks, retorno do agente de voz). */
export const getByEmail = query({
  args: { email: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    const expected = process.env.NOTIFY_SECRET;
    if (!expected || args.secret !== expected) return null;
    return await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
  },
});

/** Press kit público: só o que o artista quer que o contratante veja. Sem ids. */
export const publicEpk = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const p = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", args.email.trim().toLowerCase()))
      .unique();
    if (!p) return null;
    const today = new Date().toISOString().slice(0, 10);
    const gigs = await ctx.db.query("gigs").withIndex("by_profile", (q) => q.eq("profileId", p._id)).collect();
    return {
      profile: {
        name: p.name, email: p.email, personType: p.personType, artAreas: p.artAreas, uf: p.uf, city: p.city,
        bio: p.bio, portfolioUrl: p.portfolioUrl, phone: p.phone, tagline: p.tagline, photoUrl: p.photoUrl,
        videoUrl: p.videoUrl, musicLinks: p.musicLinks,
      },
      // agenda pública: só data, nome e local dos próximos — sem cachê
      gigs: gigs
        .filter((g) => g.date >= today && g.status !== "cancelado")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6)
        .map((g) => ({ title: g.title, venue: g.venue, date: g.date, status: g.status })),
    };
  },
});

// INTERNA: devolve todos os perfis (e-mail, telefone). Era pública — qualquer
// visitante listava a base inteira. Só as rotinas agendadas usam.
export const list = internalQuery({
  handler: async (ctx) => await ctx.db.query("profiles").collect(),
});

export const getById = internalQuery({
  args: { id: v.id("profiles") },
  handler: async (ctx, { id }) => await ctx.db.get(id),
});

export const upsert = mutation({
  args: {
    token: v.string(),
    name: v.string(),
    personType: v.string(),
    artAreas: v.array(v.string()),
    uf: v.optional(v.string()),
    bio: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    tagline: v.optional(v.string()),
    city: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    musicLinks: v.optional(v.array(v.string())),
    goals: v.optional(v.array(v.string())),
    stage: v.optional(v.string()),
    wonEdital: v.optional(v.boolean()),
    socialLinks: v.optional(v.array(v.string())),
    team: v.optional(v.array(v.object({ name: v.string(), role: v.optional(v.string()), phone: v.optional(v.string()) }))),
    onboarded: v.optional(v.boolean()),
  },
  handler: async (ctx, { onboarded, token, ...fields }) => {
    // o e-mail vem da sessão, nunca do formulário: ninguém cria ou edita perfil alheio
    const email = await emailOfSession(ctx, token);
    if (!email) throw new Error("Sessão expirada. Entra de novo.");
    const args = { ...fields, email };
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    const stamp = onboarded ? { onboardedAt: Date.now() } : {};
    if (existing) {
      // não apaga o que já existe quando um formulário manda campo vazio
      const patch = Object.fromEntries(
        Object.entries(args).filter(([, val]) => val !== undefined && val !== "" && !(Array.isArray(val) && val.length === 0))
      );
      await ctx.db.patch(existing._id, { ...patch, ...(existing.onboardedAt ? {} : stamp) });
      // terminou o onboarding agora: o Manager estuda o artista e o coach já chega com diagnóstico
      if (onboarded && !existing.onboardedAt) await ctx.scheduler.runAfter(0, internal.onboard.study, { profileId: existing._id });
      return existing._id;
    }
    const id = await ctx.db.insert("profiles", { ...args, ...stamp, plan: "free", createdAt: Date.now() });
    if (onboarded) await ctx.scheduler.runAfter(0, internal.onboard.study, { profileId: id });
    return id;
  },
});

/** Apaga a conta: perfil, todos os registros e os arquivos enviados. Sem volta. */
export const deleteAccount = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const email = await emailOfSession(ctx, args.token);
    if (!email) throw new Error("Sessão expirada. Entra de novo.");
    const profile = await ctx.db.query("profiles").withIndex("by_email", (q) => q.eq("email", email)).unique();
    if (profile) {
      const id = profile._id;
      const docs = await ctx.db.query("documents").withIndex("by_profile", (q) => q.eq("profileId", id)).collect();
      for (const d of docs) {
        if (d.storageId) await ctx.storage.delete(d.storageId).catch(() => {});
        await ctx.db.delete(d._id);
      }
      const byProfile = ["pipelineItems", "contacts", "sabatinaSessions", "subscriptions", "leads", "agentActivity", "gigs", "riders", "coachMessages", "expenses"] as const;
      for (const table of byProfile) {
        const rows = await ctx.db.query(table).withIndex("by_profile", (q: any) => q.eq("profileId", id)).collect();
        for (const r of rows) await ctx.db.delete(r._id);
      }
      for (const table of ["alertLog", "unlockedEdits"] as const) {
        const rows = await ctx.db.query(table).withIndex("by_profile_opp", (q: any) => q.eq("profileId", id)).collect();
        for (const r of rows) await ctx.db.delete(r._id);
      }
      const pend = await ctx.db.query("pendingActions").withIndex("by_profile", (q) => q.eq("profileId", id)).collect();
      for (const r of pend) await ctx.db.delete(r._id);
      const pix = await ctx.db.query("pixCharges").collect();
      for (const r of pix) if (r.profileId === id) await ctx.db.delete(r._id);
      await ctx.db.delete(id);
    }
    const sessions = await ctx.db.query("sessions").withIndex("by_email", (q) => q.eq("email", email)).collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    return { deleted: true };
  },
});
