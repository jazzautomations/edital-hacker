"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VoiceSabatina from "@/components/VoiceSabatina";

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
};

export default function Coach() {
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("manager_email") ?? "" : ""
  );
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

  const connectGmail = async () => {
    const r = await fetch("/api/email-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: profile.email, action: "initiate" }),
    });
    const d = await r.json();
    if (d.redirectUrl) window.location.href = d.redirectUrl;
  };

  useEffect(() => {
    if (ctx?.history?.length && msgs.length === 0) {
      setMsgs(ctx.history.map((m: any) => ({ role: m.role, text: m.text })));
    }
  }, [ctx, msgs.length]);
  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">O Coach</h1>
        <p className="text-sm text-neutral-400">
          O mentor que lembra de tudo — teus cachês, leads, prazos e sabatinas.
        </p>
        <form className="flex flex-col gap-3"
          onSubmit={(e) => { e.preventDefault(); localStorage.setItem("manager_email", email); setEmail(email); }}>
          <input className="rounded-xl bg-neutral-900 px-4 py-3" placeholder="seu@email.com" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black">Entrar</button>
        </form>
      </main>
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
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-6">
      <header className="mb-4 flex items-end justify-between">
        <div>
          <Link href="/" className="font-mono text-xs text-emerald-400">manager_</Link>
          <h1 className="text-2xl font-bold">O Coach</h1>
          <p className="font-mono text-[10px] text-neutral-500">memória: {stats}</p>
        </div>
        <div className="flex gap-3 text-xs">
          {gmail.configured && (
            gmail.connected ? (
              <span className="text-emerald-400">✓ gmail</span>
            ) : (
              <button onClick={connectGmail} className="text-amber-400 hover:underline">
                conectar gmail
              </button>
            )
          )}
          <Link href="/agenda" className="text-emerald-400 hover:underline">agenda</Link>
          <Link href="/prospeccao" className="text-emerald-400 hover:underline">prospecção</Link>
          <Link href="/rider" className="text-emerald-400 hover:underline">rider</Link>
        </div>
      </header>

      <VoiceSabatina mode="coach" profileEmail={profile.email} />

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
              m.role === "user" ? "bg-emerald-600/20 text-emerald-100" : "bg-neutral-900 text-neutral-200"
            }`}>
              {m.role === "assistant" && <p className="mb-1 font-mono text-[9px] uppercase text-emerald-500">coach</p>}
              <p className="whitespace-pre-wrap">{m.text}</p>
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
