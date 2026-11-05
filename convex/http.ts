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

export default http;
