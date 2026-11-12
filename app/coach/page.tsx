"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VoiceSabatina from "@/components/VoiceSabatina";
import { useAuthEmail } from "@/lib/useAuth";
import { SignIn } from "@/components/SignIn";
import { RichText } from "@/lib/format";

// O Coach — chat com memória total da carreira. É a promessa central:
// um mentor que sabe teus cachês, teus leads, teus prazos e tuas sabatinas
// sem tu precisar repetir nada. O contexto inteiro vai no system prompt.

type Msg = { role: "user" | "assistant"; text: string; actions?: string[] };

const SUGGESTIONS = [
  "Me acha casas de show no Rio que tocam MPB",
  "Anota: sexta eu toco no Bar do Zé por R$ 1.500",
  "Como tá meu mês em R$?",
  "Monta meu rider técnico pra mandar pro produtor",
];

const ACTION_LABEL: Record<string, string> = {
  prospect_leads: "caçou leads na web",
  create_gig: "anotou na agenda",
  update_lead_status: "moveu lead no funil",
  prepare_document: "preparou documento",
  list_unanswered_emails: "leu tua caixa",
  draft_email_reply: "rascunho no Gmail",
  research_target: "montou dossiê OSINT",
  review_contract: "revisou contrato",
  check_calendar: "leu o Calendar",
  sync_gig_to_calendar: "jogou no Calendar",
};

export default function Coach() {
  const { email, setEmail, locked, authEnabled, ready } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as any;
  const ctx = useQuery(
    api.riders.coachContext,
    profile ? { profileId: profile._id } : "skip"
  ) as any;

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [gmail, setGmail] = useState<{ configured?: boolean; connected?: boolean }>({});
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profile?.email) return;
    fetch("/api/email-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email }),
    })
      .then((r) => r.json())
      .then(setGmail)
      .catch(() => {});
  }, [profile?.email]);

  const connectGmail = async (action = "initiate") => {
    const r = await fetch("/api/email-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, action }),
    });
    const d = await r.json();
    if (d.redirectUrl) window.location.href = d.redirectUrl;
  };

  useEffect(() => {
    if (ctx?.history?.length && msgs.length === 0) {
      setMsgs(ctx.history.map((m: any) => ({ role: m.role, text: m.text })));
    }
  }, [ctx, msgs.length]);
  useEffect(() => {
    // chaves: scrollIntoView() agora devolve Promise no Chromium e o React
    // tentava chamá-la como cleanup → "i is not a function" derrubava a página
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  if (!profile) {
    return (
      <SignIn
        title="Teu coach"
        blurb="O manager que lembra de tudo: cachês, leads, prazos e sabatinas."
        email={email}
        setEmail={setEmail}
        locked={locked}
        authEnabled={authEnabled}
        ready={ready}
        profile={profile}
      />
    );
  }

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setMsgs((m) => [...m, { role: "user", text: msg }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileEmail: profile.email, message: msg }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        { role: "assistant", text: data.reply ?? data.error ?? "—", actions: data.actions },
      ]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", text: "Caiu a conexão com o coach — tenta de novo." }]);
    } finally { setBusy(false); }
  };

  const stats = ctx
    ? `${ctx.gigs?.length ?? 0} gigs · ${ctx.leads?.length ?? 0} leads · ${ctx.pipeline?.length ?? 0} no pipeline · ${ctx.sabatinas?.length ?? 0} sabatinas`
    : "carregando memória…";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl sm:text-5xl text-neutral-50">O Coach</h1>
          <p className="font-mono text-[10px] text-neutral-500">memória: {stats}</p>
        </div>
        <div className="flex gap-3 text-xs">
          {gmail.configured && (
            gmail.connected ? (
              <span className="text-emerald-400">✓ gmail</span>
            ) : (
              <button onClick={() => connectGmail("initiate")} className="text-amber-400 hover:underline">
                conectar gmail
              </button>
            )
          )}
          {(gmail as any).calendarConfigured && (
            (gmail as any).calendar ? (
              <span className="text-emerald-400">✓ agenda</span>
            ) : (
              <button onClick={() => connectGmail("initiate_calendar")} className="text-amber-400 hover:underline">
                conectar agenda
              </button>
            )
          )}
          <Link href="/agenda" className="text-emerald-400 hover:underline">agenda</Link>
          <Link href="/prospeccao" className="text-emerald-400 hover:underline">prospecção</Link>
          <Link href="/rider" className="text-emerald-400 hover:underline">rider</Link>
        </div>
      </header>

      <VoiceSabatina mode="coach" profileEmail={profile.email} />

      <Briefing profileId={profile._id} ctx={ctx} />

      <ActivityFeed profileId={profile._id} />

      <div className="mb-4 mt-4 flex-1 overflow-y-auto rounded-2xl border border-neutral-800 p-4">
        {msgs.length === 0 && (
          <div className="flex h-full flex-col justify-center gap-4">
            <p className="text-center text-sm text-neutral-400">
              Salve, {profile.name.split(" ")[0]}. Eu sei onde tu tá na carreira — pergunta qualquer coisa.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)}
                  className="rounded-xl border border-neutral-800 px-4 py-3 text-left text-sm text-neutral-300 hover:border-emerald-500/50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`mb-3 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user" ? "bg-emerald-400 text-neutral-950" : "border border-neutral-800 bg-neutral-900 text-neutral-200"
            }`}>
              {m.role === "assistant" && <p className="mb-1 font-mono text-[9px] uppercase text-emerald-500">coach</p>}
              <p className="whitespace-pre-wrap">{m.role === "assistant" ? <RichText text={m.text} /> : m.text}</p>
              {m.actions?.length ? (
                <p className="mt-2 border-t border-neutral-700/60 pt-2 font-mono text-[10px] text-emerald-400">
                  ⚙️ executou: {m.actions.map((a) => ACTION_LABEL[a] ?? a).join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        ))}
        {busy && <p className="text-xs text-neutral-500">o coach tá trabalhando…</p>}
        <div ref={bottom} />
      </div>

      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-sm" placeholder="fala com teu coach…"
          value={input} onChange={(e) => setInput(e.target.value)} />
        <button disabled={busy || !input.trim()}
          className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black disabled:opacity-40">
          →
        </button>
      </form>
    </main>
  );
}

// Briefing "enquanto você dormia" — deriva urgências do contexto + fila de
// propostas do reply-detect. Aparece só quando tem algo a dizer.
function Briefing({ profileId, ctx }: { profileId: string; ctx: any }) {
  const pending = useQuery(
    api.pendingActions.listPending,
    profileId ? { profileId: profileId as any } : "skip"
  ) as { _id: string; label: string }[] | undefined;
  if (!ctx) return null;

  const now = Date.now();
  const inDays = (iso?: string) =>
    iso ? Math.ceil((new Date(iso).getTime() - now) / 86400000) : null;
  const items: { icon: string; text: string; href?: string; tone: string }[] = [];

  for (const p of pending ?? [])
    items.push({ icon: "📬", text: `proposta: ${p.label}`, href: "/prospeccao", tone: "text-violet-300" });

  for (const i of ctx.pipeline ?? []) {
    const d = inDays(i.opportunity?.registrationTo);
    if (d !== null && d >= 0 && d <= 7 && i.stage !== "inscrito" && i.stage !== "resultado")
      items.push({ icon: "⏰", text: `${i.opportunity?.name} fecha em ${d}d`, href: "/pipeline", tone: "text-amber-300" });
  }

  for (const d of ctx.docs ?? []) {
    const dd = inDays(d.expiresAt);
    if (dd !== null && dd <= 30)
      items.push({ icon: "📄", text: dd < 0 ? `${d.name} VENCEU` : `${d.name} vence em ${dd}d`, href: "/agenda", tone: dd < 0 ? "text-red-400" : "text-amber-300" });
  }

  for (const g of ctx.gigs ?? []) {
    const d = inDays(g.date);
    if (d !== null && d >= 0 && d <= 7)
      items.push({ icon: "🎤", text: `${g.title} — ${g.date.slice(5)}${g.fee ? ` · R$ ${g.fee.toLocaleString("pt-BR")}` : ""}`, href: "/agenda", tone: "text-sky-300" });
    if (g.status === "feito" && d !== null && d < 0)
      items.push({ icon: "💸", text: `${g.title} rolou e R$ ${g.fee?.toLocaleString("pt-BR") ?? "—"} não consta pago — cobra`, href: "/agenda", tone: "text-red-300" });
    if (g.status === "feito" && d !== null && d >= -2)
      items.push({ icon: "🎵", text: `${g.title}: roteiro ECAD vence em ~48h úteis — sem ele a verba vai pra outros autores`, href: "/agenda", tone: "text-amber-300" });
  }

  if (!items.length) return null;
  return (
    <div className="mt-3 rounded-xl border border-neutral-800 p-3 text-xs">
      <p className="mb-2 font-semibold text-neutral-300">☀️ enquanto você dormia ({items.length})</p>
      <ul className="flex flex-col gap-1.5">
        {items.slice(0, 8).map((it, i) => (
          <li key={i} className={it.tone}>
            {it.icon} {it.href ? <Link href={it.href} className="hover:underline">{it.text}</Link> : it.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Diário do Manager — evidência do trabalho do agente (realtime).
function ActivityFeed({ profileId }: { profileId: string }) {
  const items = useQuery(api.activity.list, { profileId: profileId as any }) as
    | { _id: string; verb: string; detail?: string; result?: string; createdAt: number }[]
    | undefined;
  if (!items?.length) return null;
  return (
    <details className="mt-3 rounded-xl border border-neutral-800 p-3 text-xs">
      <summary className="cursor-pointer font-semibold text-neutral-300">
        ⚡ diário do Manager — o que ele já fez ({items.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-1.5">
        {items.slice(0, 8).map((a) => (
          <li key={a._id} className="flex items-baseline gap-2">
            <span className={a.result === "erro" ? "text-red-400" : a.result === "proposta" ? "text-violet-400" : "text-emerald-400"}>
              {a.result === "erro" ? "✗" : a.result === "proposta" ? "◈" : "✓"}
            </span>
            <span className="text-neutral-300">{a.verb}</span>
            <span className="truncate text-neutral-600">{a.detail}</span>
            <span className="ml-auto shrink-0 text-neutral-700">
              {new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
