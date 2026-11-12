import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";

// Entrada por código no e-mail. Antes, digitar o e-mail de alguém bastava pra
// abrir a conta dessa pessoa (documentos inclusos). Agora:
//   requestCode → código de 6 dígitos por e-mail (vale 10 min, 5 tentativas)
//   verifyCode  → troca o código por um token de sessão (30 dias)
// No banco ficam só os hashes; o código e o token nunca são gravados em claro.

const CODE_TTL = 10 * 60_000;
const SESSION_TTL = 30 * 24 * 3600_000;
const RESEND_GAP = 30_000;
const MAX_ATTEMPTS = 5;

const normEmail = (e: string) => e.trim().toLowerCase();
const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomDigits(n: number): string {
  const a = new Uint32Array(n);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => String(x % 10)).join("");
}

function randomToken(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** E-mail da sessão, ou null se o token não vale. Usado pelas funções que entregam dados pessoais. */
export async function emailOfSession(ctx: QueryCtx, token: string | undefined | null): Promise<string | null> {
  if (!token || token.length < 32) return null;
  const tokenHash = await sha256(token);
  const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).unique();
  if (!s || s.expiresAt < Date.now()) return null;
  return s.email;
}

export const me = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const email = await emailOfSession(ctx, args.token);
    return email ? { email } : null;
  },
});

export const storeCode = internalMutation({
  args: { email: v.string(), codeHash: v.string() },
  handler: async (ctx, args): Promise<{ ok: boolean; waitMs?: number }> => {
    const prev = await ctx.db.query("loginCodes").withIndex("by_email", (q) => q.eq("email", args.email)).collect();
    const newest = prev.reduce((m, c) => Math.max(m, c.createdAt), 0);
    const wait = newest + RESEND_GAP - Date.now();
    if (wait > 0) return { ok: false, waitMs: wait };
    for (const c of prev) await ctx.db.delete(c._id);
    await ctx.db.insert("loginCodes", {
      email: args.email,
      codeHash: args.codeHash,
      attempts: 0,
      createdAt: Date.now(),
      expiresAt: Date.now() + CODE_TTL,
    });
    return { ok: true };
  },
});

export const requestCode = action({
  args: { email: v.string() },
  handler: async (ctx, args): Promise<{ sent: boolean; waitSeconds?: number }> => {
    const email = normEmail(args.email);
    if (!validEmail(email)) throw new Error("E-mail inválido");
    const key = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!key || !from) throw new Error("Envio de e-mail não configurado");

    const code = randomDigits(6);
    const stored = await ctx.runMutation(internal.auth.storeCode, { email, codeHash: await sha256(`${email}:${code}`) });
    if (!stored.ok) return { sent: false, waitSeconds: Math.ceil((stored.waitMs ?? RESEND_GAP) / 1000) };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `${code} é teu código do Manager`,
        text: `Teu código pra entrar no Manager: ${code}\n\nEle vale por 10 minutos. Se não foi você que pediu, pode ignorar este e-mail.`,
        html: `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:440px;margin:0 auto;padding:32px 24px;color:#1d1a17">
<p style="font-size:15px;margin:0 0 20px">Teu código pra entrar no <b>Manager</b>:</p>
<p style="font-size:38px;letter-spacing:8px;font-weight:700;margin:0 0 20px;font-family:ui-monospace,Menlo,monospace">${code}</p>
<p style="font-size:14px;color:#5d564d;margin:0">Vale por 10 minutos. Se não foi você que pediu, pode ignorar este e-mail.</p></div>`,
      }),
    });
    if (!res.ok) {
      console.error("[auth] resend", res.status, (await res.text()).slice(0, 200));
      throw new Error("Não consegui enviar o e-mail agora");
    }
    return { sent: true };
  },
});

export const checkCode = internalMutation({
  args: { email: v.string(), codeHash: v.string() },
  handler: async (ctx, args): Promise<"ok" | "wrong" | "expired" | "locked"> => {
    const rows = await ctx.db.query("loginCodes").withIndex("by_email", (q) => q.eq("email", args.email)).collect();
    const row = rows.sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!row || row.expiresAt < Date.now()) return "expired";
    if (row.attempts >= MAX_ATTEMPTS) return "locked";
    if (row.codeHash !== args.codeHash) {
      await ctx.db.patch(row._id, { attempts: row.attempts + 1 });
      return row.attempts + 1 >= MAX_ATTEMPTS ? "locked" : "wrong";
    }
    for (const c of rows) await ctx.db.delete(c._id);
    return "ok";
  },
});

export const createSession = internalMutation({
  args: { email: v.string(), tokenHash: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessions", {
      email: args.email,
      tokenHash: args.tokenHash,
      createdAt: Date.now(),
      expiresAt: Date.now() + SESSION_TTL,
    });
  },
});

export const verifyCode = action({
  args: { email: v.string(), code: v.string() },
  handler: async (ctx, args): Promise<{ token?: string; email?: string; error?: "wrong" | "expired" | "locked" }> => {
    const email = normEmail(args.email);
    const code = args.code.replace(/\D/g, "");
    if (!validEmail(email) || code.length !== 6) return { error: "wrong" };
    const result = await ctx.runMutation(internal.auth.checkCode, { email, codeHash: await sha256(`${email}:${code}`) });
    if (result !== "ok") return { error: result };
    const token = randomToken();
    await ctx.runMutation(internal.auth.createSession, { email, tokenHash: await sha256(token) });
    return { token, email };
  },
});

/** Sessão a partir de um login já verificado por terceiro (WorkOS). Só o servidor do app chama. */
export const serverSession = action({
  args: { email: v.string(), secret: v.string() },
  handler: async (ctx, args): Promise<{ token: string }> => {
    const expected = process.env.NOTIFY_SECRET;
    if (!expected || args.secret !== expected) throw new Error("não autorizado");
    const token = randomToken();
    await ctx.runMutation(internal.auth.createSession, { email: normEmail(args.email), tokenHash: await sha256(token) });
    return { token };
  },
});

export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const tokenHash = await sha256(args.token);
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("tokenHash", tokenHash)).unique();
    if (s) await ctx.db.delete(s._id);
  },
});

/** Só pra teste automatizado, via CLI de administrador: diz se existe código pendente. */
export const pendingCode = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db.query("loginCodes").withIndex("by_email", (q) => q.eq("email", normEmail(args.email))).collect();
    return rows.map((r) => ({ attempts: r.attempts, expiresInSec: Math.round((r.expiresAt - Date.now()) / 1000) }));
  },
});

/** Só pra teste automatizado, via CLI de administrador: grava um código conhecido. */
export const seedCodeForTest = internalMutation({
  args: { email: v.string(), codeHash: v.string() },
  handler: async (ctx, args) => {
    const email = normEmail(args.email);
    const prev = await ctx.db.query("loginCodes").withIndex("by_email", (q) => q.eq("email", email)).collect();
    for (const c of prev) await ctx.db.delete(c._id);
    await ctx.db.insert("loginCodes", { email, codeHash: args.codeHash, attempts: 0, createdAt: Date.now(), expiresAt: Date.now() + CODE_TTL });
  },
});
