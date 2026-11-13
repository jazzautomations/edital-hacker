import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Webhook AbacatePay — URL: https://<deployment>.convex.site/webhooks/abacatepay?webhookSecret=...
// O segredo vai na query string da URL cadastrada no painel.
http.route({
  path: "/webhooks/abacatepay",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const provided =
      url.searchParams.get("webhookSecret") ??
      req.headers.get("x-webhook-secret");
    const expected = process.env.ABACATEPAY_WEBHOOK_SECRET;
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ ok: false }), { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const kind = String(body?.event ?? "");
    const data = body?.data ?? {};
    const eventId = `${kind}:${data?.id ?? body?.id ?? Date.now()}`;
    const result = await ctx.runMutation(internal.billing.applyEvent, {
      eventId,
      kind,
      data,
    });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Webhook Firecrawl Monitoring — eventos monitor.page chegam aqui quando um
// target (crawl de portal ou search web-wide) encontra página relevante pro goal.
// URL: https://<deployment>.convex.site/webhooks/firecrawl
http.route({
  path: "/webhooks/firecrawl",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const provided = req.headers.get("x-webhook-secret");
    const expected = process.env.FIRECRAWL_WEBHOOK_SECRET;
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ ok: false }), { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const event = String(body?.event ?? body?.type ?? "");
    const pages: any[] = body?.data?.pages ?? (body?.data?.url ? [body.data] : []);
    let upserted = 0;
    for (const p of pages) {
      const url = p.url ?? p.sourceURL;
      if (!url) continue;
      const title = p.title ?? p.metadata?.title ?? p.name ?? url;
      try {
        await ctx.runMutation(internal.opportunities.upsert, {
          source: "firecrawl-monitor",
          sourceName: body?.data?.monitorName ?? "Monitor web",
          externalId: url,
          name: String(title).slice(0, 200),
          shortDescription: p.judgment?.reason ?? p.summary ?? undefined,
          registrationTo: p.extracted?.registrationTo,
          proponentTypes: [],
          categories: [],
          sourceUrl: url,
        });
        upserted++;
      } catch {
        // página malformada não derruba o lote
      }
    }
    return new Response(JSON.stringify({ ok: true, event, upserted }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Webhook Resend inbound — email.received: resposta do contratante cai aqui
// quando os envios do Manager saem com reply_to no domínio de recebimento.
// URL: https://<deployment>.convex.site/webhooks/resend?webhookSecret=...
http.route({
  path: "/webhooks/resend",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const url = new URL(req.url);
    const provided =
      url.searchParams.get("webhookSecret") ??
      req.headers.get("x-webhook-secret");
    const expected = process.env.RESEND_WEBHOOK_SECRET;
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ ok: false }), { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    if (body?.type !== "email.received") {
      return new Response(JSON.stringify({ ok: true, ignored: body?.type }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    const d = body?.data ?? {};
    const result = await ctx.runMutation(internal.inbound.handleInbound, {
      from: String(d.from ?? ""),
      subject: String(d.subject ?? "(sem assunto)"),
      snippet: String(d.text ?? d.html ?? "").replace(/<[^>]+>/g, " ").slice(0, 500),
    });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Webhook Nvoip — status de entrega de SMS/WhatsApp (opcional, telemetria).
http.route({
  path: "/webhooks/nvoip",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const provided = req.headers.get("x-webhook-secret");
    const expected = process.env.NVOIP_WEBHOOK_SECRET;
    if (!expected || provided !== expected) {
      return new Response(JSON.stringify({ ok: false }), { status: 401 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }),
});

// WhatsApp do artista (servidor Evolution): QR, conexão e mensagens recebidas.
// URL cadastrada na criação de cada instância mgr-*, com o header x-zap-secret.
http.route({
  path: "/zap/webhook",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.ZAP_SECRET;
    if (!secret || req.headers.get("x-zap-secret") !== secret) return new Response("forbidden", { status: 403 });
    const body = (await req.json().catch(() => null)) as any;
    const instance = String(body?.instance ?? "");
    if (!instance.startsWith("mgr-")) return new Response("ok");
    const event = String(body?.event ?? "").toLowerCase().replace(/_/g, ".");
    const data = body?.data ?? {};
    if (event === "qrcode.updated") {
      const qr = data?.qrcode?.base64 ?? data?.base64;
      if (typeof qr === "string" && qr.startsWith("data:image")) await ctx.runMutation(internal.zap.onEvent, { instance, event: "qr", qr });
    } else if (event === "connection.update") {
      const phone = typeof data?.wuid === "string" ? data.wuid.split("@")[0] : undefined;
      await ctx.runMutation(internal.zap.onEvent, { instance, event: "connection", state: String(data?.state ?? ""), phone });
    } else if (event === "messages.upsert") {
      const items = Array.isArray(data) ? data : [data];
      for (const m of items) {
        const key = m?.key ?? {};
        if (key.fromMe) continue;
        // conta com privacidade nova vem como @lid; o número real fica no Alt/senderPn
        const jid = [key.remoteJid, key.remoteJidAlt, key.senderPn, m?.senderPn].find((j: unknown) => typeof j === "string" && j.endsWith("@s.whatsapp.net"));
        if (!jid || String(key.remoteJid ?? "").endsWith("@g.us")) continue;
        const text = m?.message?.conversation ?? m?.message?.extendedTextMessage?.text ?? m?.message?.imageMessage?.caption ?? "";
        if (!text || !key.id) continue;
        const phone = jid.split("@")[0];
        const threadId = await ctx.runMutation(internal.zap.saveInbound, { msgId: String(key.id), instance, phone, text: String(text).slice(0, 4000) });
        if (threadId) await ctx.scheduler.runAfter(0, internal.zap.handleInbound, { threadId, text: String(text).slice(0, 4000) });
      }
    }
    return new Response("ok");
  }),
});

export default http;
