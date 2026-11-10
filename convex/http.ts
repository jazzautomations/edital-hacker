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

export default http;
