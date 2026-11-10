import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";

// Varre os perfis e chama /api/reply-detect (no Next — Composio + LLM ficam
// lá). O loop matador: resposta de contratante no inbox → lead move no funil.
export const run = internalAction({
  handler: async (ctx) => {
    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) return { skipped: "APP_URL not set" };
    const profiles = await ctx.runQuery(api.profiles.list, {});
    const out: { email: string; moved?: any[]; error?: string }[] = [];
    for (const profile of profiles) {
      try {
        const r = await fetch(`${appUrl}/api/reply-detect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-notify-secret": process.env.NOTIFY_SECRET ?? "",
          },
          body: JSON.stringify({ email: profile.email }),
        }).then((res) => res.json());
        if (r?.moved?.length) out.push({ email: profile.email, moved: r.moved });
      } catch (e) {
        out.push({ email: profile.email, error: String(e).slice(0, 120) });
      }
    }
    return out;
  },
});
