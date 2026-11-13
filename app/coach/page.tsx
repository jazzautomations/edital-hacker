"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VoiceSabatina from "@/components/VoiceSabatina";
import { CallHistory } from "@/components/CallHistory";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import { SignIn } from "@/components/SignIn";
import { RichText } from "@/lib/format";
import { Badge, Button, Textarea, dataCurta } from "@/components/ui";

// O Coach — chat com memória total da carreira. É a promessa central:
// um mentor que sabe teus cachês, teus leads, teus prazos e tuas sabatinas
// sem tu precisar repetir nada. O contexto inteiro vai no system prompt.

type Msg = { role: "user" | "assistant"; text: string; actions?: string[]; via?: string };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const SUGGESTIONS = [
  "Me acha casas de show no Rio que tocam MPB",
  "Anota: sexta eu toco no Bar do Zé por R$ 1.500",
  "Como tá meu mês em R$?",
  "Monta meu rider técnico pra mandar pro produtor",
];

const ACTION_LABEL: Record<string, string> = {
  prospect_leads: "caçou leads na web",
  buscar_editais: "buscou no radar",
  salvar_edital: "salvou no pipeline",
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
  const { email, token, ready } = useAuthEmail();
  const profile = useMyProfile() as any;
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
      body: JSON.stringify({ token }),
    })
      .then((r) => r.json())
      .then(setGmail)
      .catch(() => {});
  }, [profile?.email, token]);

  const connectGmail = async (action = "initiate") => {
    const r = await fetch("/api/email-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, action }),
    });
    const d = await r.json();
    if (d.redirectUrl) window.location.href = d.redirectUrl;
  };

  // Histórico do servidor: carrega na abertura e de novo quando chega a
  // transcrição de uma chamada de voz (gravada ao desligar).
  // /coach?msg=... (atalhos de outras telas) já chega com a pergunta escrita
  useEffect(() => {
    const m = new URLSearchParams(window.location.search).get("msg");
    if (m) setInput(m.slice(0, 500));
  }, []);
  const voiceSeen = useRef(-1);
  useEffect(() => {
    const hist = (ctx?.history ?? []) as { role: Msg["role"]; text: string; via?: string }[];
    const voice = hist.filter((m) => m.via === "voz").length;
    if ((msgs.length === 0 && hist.length) || (voiceSeen.current >= 0 && voice > voiceSeen.current)) {
      setMsgs(hist.map((m) => ({ role: m.role, text: m.text, via: m.via })));
    }
    if (ctx) voiceSeen.current = voice;
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
        body: JSON.stringify({ token, message: msg }),
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
    ? [
        plural(ctx.gigs?.length ?? 0, "trabalho", "trabalhos"),
        plural(ctx.leads?.length ?? 0, "contratante", "contratantes"),
        plural(ctx.pipeline?.length ?? 0, "edital", "editais"),
        plural(ctx.docs?.length ?? 0, "documento", "documentos"),
      ].join(", ")
    : "";

  const g = gmail as { configured?: boolean; connected?: boolean; calendarConfigured?: boolean; calendar?: boolean };

  return (
    <main className="mx-auto flex h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col px-4 pt-6 sm:px-6 sm:pt-8">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl text-neutral-50 sm:text-5xl">Teu coach</h1>
          <p className="mt-2 text-sm text-neutral-400">
            {ctx ? `Lembra de ${stats}.` : "Carregando o que ele sabe da tua carreira."}
          </p>
        </div>
        {(g.configured || g.calendarConfigured) && (
          <div className="flex flex-wrap gap-2">
            {g.configured &&
              (g.connected ? (
                <Badge tone="good">Gmail conectado</Badge>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => connectGmail("initiate")}>Conectar Gmail</Button>
              ))}
            {g.calendarConfigured &&
              (g.calendar ? (
                <Badge tone="good">Agenda Google conectada</Badge>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => connectGmail("initiate_calendar")}>Conectar Google Agenda</Button>
              ))}
          </div>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4" aria-live="polite">
        <VoiceSabatina mode="coach" profileEmail={profile.email} />
        <CallHistory />
        <Briefing profileId={profile._id} ctx={ctx} />
        <ActivityFeed profileId={profile._id} />

        <div className="mt-5 flex flex-1 flex-col gap-3">
          {msgs.length === 0 && (
            <div className="my-auto flex flex-col gap-4 py-6">
              <p className="text-center text-base text-neutral-300">
                Fala, {profile.name.split(" ")[0]}. Pede em português normal que eu faço:
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    onClick={() => send(sug)}
                    className="rounded-2xl border border-neutral-800 bg-neutral-900/50 px-4 py-3.5 text-left text-sm leading-relaxed text-neutral-200 hover:border-emerald-500/50 hover:bg-neutral-900"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user" ? "self-end bg-emerald-400 text-neutral-950" : "self-start border border-neutral-800 bg-neutral-900 text-neutral-200"
              }`}
            >
              {m.via === "voz" && (
                <p className={`mb-1 font-mono text-[10px] uppercase tracking-[0.15em] ${m.role === "user" ? "text-neutral-800" : "text-neutral-500"}`}>na chamada</p>
              )}
              <p className="whitespace-pre-wrap">{m.role === "assistant" ? <RichText text={m.text} /> : m.text}</p>
              {m.actions?.length ? (
                <p className="mt-2.5 flex flex-wrap gap-1.5 border-t border-neutral-800 pt-2.5">
                  {m.actions.map((act, n) => (
                    <Badge key={n} tone="good">{ACTION_LABEL[act] ?? act}</Badge>
                  ))}
                </p>
              ) : null}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 self-start rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
              <span className="flex gap-1" aria-hidden>
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500" />
              </span>
              Trabalhando nisso
            </div>
          )}
          <div ref={bottom} />
        </div>
      </div>

      <form className="flex items-end gap-2 border-t border-neutral-800/70 py-3" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <label className="sr-only" htmlFor="msg-coach">Mensagem pro coach</label>
        <Textarea
          id="msg-coach"
          rows={1}
          className="max-h-36 !min-h-11 flex-1 resize-none"
          placeholder="Ex.: anota que sexta toco no Bar do Zé por R$ 1.500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" size="lg" className="h-11" disabled={busy || !input.trim()}>
          Enviar
        </Button>
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
    items.push({ icon: "", text: `Sugestão esperando tua decisão: ${p.label}`, href: "/prospeccao", tone: "text-violet-300" });

  for (const i of ctx.pipeline ?? []) {
    const d = inDays(i.opportunity?.registrationTo);
    if (d !== null && d >= 0 && d <= 7 && i.stage !== "inscrito" && i.stage !== "resultado")
      items.push({ icon: "⏰", text: `Inscrição fechando em ${d === 0 ? "hoje" : d === 1 ? "1 dia" : `${d} dias`}: ${i.opportunity?.name}`, href: "/pipeline", tone: "text-amber-300" });
  }

  for (const d of ctx.docs ?? []) {
    const dd = inDays(d.expiresAt);
    if (dd !== null && dd <= 30)
      items.push({ icon: "📄", text: dd < 0 ? `Documento vencido: ${d.name}` : `${d.name} vence em ${dd} dias`, href: "/documentos", tone: dd < 0 ? "text-red-400" : "text-amber-300" });
  }

  for (const g of ctx.gigs ?? []) {
    const d = inDays(g.date);
    if (d !== null && d >= 0 && d <= 7)
      items.push({ icon: "🎤", text: `${dataCurta(g.date)}: ${g.title}${g.fee ? `, R$ ${g.fee.toLocaleString("pt-BR")}` : ""}`, href: "/agenda", tone: "text-sky-300" });
    if (g.status === "feito" && d !== null && d < 0)
      items.push({ icon: "💸", text: `Cobrar: ${g.title} já aconteceu e o cachê${g.fee ? ` de R$ ${g.fee.toLocaleString("pt-BR")}` : ""} ainda não entrou`, href: "/agenda", tone: "text-red-300" });
    if (g.status === "feito" && d !== null && d >= -2)
      items.push({ icon: "🎵", text: `Entregar o roteiro ECAD de ${g.title} em até 48h úteis, senão o direito autoral vai pra outros autores`, href: "/agenda", tone: "text-amber-300" });
  }

  if (!items.length) return null;
  return (
    <section className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm">
      <h2 className="mb-2.5 font-semibold text-neutral-100">Pra resolver agora ({items.length})</h2>
      <ul className="flex flex-col gap-2">
        {items.slice(0, 6).map((it, i) => (
          <li key={i} className={`leading-relaxed ${it.tone}`}>
            {it.href ? <Link href={it.href} className="underline decoration-current/30 underline-offset-2 hover:decoration-current">{it.text}</Link> : it.text}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Diário do Manager — evidência do trabalho do agente (realtime).
function ActivityFeed({ profileId }: { profileId: string }) {
  const items = useQuery(api.activity.list, { profileId: profileId as any }) as
    | { _id: string; verb: string; detail?: string; result?: string; createdAt: number }[]
    | undefined;
  if (!items?.length) return null;
  return (
    <details className="mt-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm">
      <summary className="cursor-pointer font-semibold text-neutral-100">
        O que o coach já fez por você ({items.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {items.slice(0, 10).map((a) => (
          <li key={a._id} className="flex items-baseline gap-2.5">
            <span aria-hidden className={a.result === "erro" ? "text-red-400" : "text-emerald-400"}>
              {a.result === "erro" ? "✕" : "✓"}
            </span>
            <span className="text-neutral-200">{a.verb}</span>
            <span className="ml-auto shrink-0 text-xs text-neutral-500">
              {new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
