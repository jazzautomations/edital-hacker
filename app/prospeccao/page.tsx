"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";

const LEAD_TYPES = [
  "casa_de_show",
  "festival",
  "marca",
  "escola",
  "produtora",
  "agencia",
  "prefeitura",
  "outro",
] as const;

const STATUS_ORDER = ["novo", "contatado", "respondeu", "negociando", "fechado", "perdido"];
const STATUS_NEXT: Record<string, string> = {
  novo: "contatado",
  contatado: "respondeu",
  respondeu: "negociando",
  negociando: "fechado",
};

const STATUS_STYLE: Record<string, string> = {
  novo: "text-sky-400",
  contatado: "text-amber-400",
  respondeu: "text-violet-400",
  negociando: "text-emerald-400",
  fechado: "text-emerald-500",
  perdido: "text-neutral-500",
};

type Lead = {
  _id: string;
  name: string;
  kind: string;
  city?: string;
  uf?: string;
  sourceUrl?: string;
  contact?: string;
  description?: string;
  status: string;
  dossier?: string;
  dossierAt?: number;
};

export default function Prospeccao() {
  const { email, setEmail, locked, authEnabled } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile | null | undefined;
  const leads = useQuery(
    api.leads.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as Lead[] | undefined;

  const pending = useQuery(
    api.pendingActions.listPending,
    profile ? { profileId: profile._id as any } : "skip"
  ) as { _id: string; label: string; description?: string }[] | undefined;
  const applyAction = useMutation(api.pendingActions.apply);
  const dismissAction = useMutation(api.pendingActions.dismiss);

  const prospect = useAction(api.discover.prospectLeads);
  const research = useAction(api.dossier.research);
  const seedMapa = useMutation(api.leads.seedMapa);
  const [dossierBusy, setDossierBusy] = useState<Set<string>>(new Set());
  const setStatus = useMutation(api.leads.setStatus);
  const removeLead = useMutation(api.leads.remove);
  const addContact = useMutation(api.contacts.add);
  const addGig = useMutation(api.gigs.add);
  const [gigForm, setGigForm] = useState<{ leadId: string; date: string; fee: string } | null>(null);

  const [leadType, setLeadType] = useState<string>("casa_de_show");
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [contacted, setContacted] = useState<Set<string>>(new Set());
  const [pitches, setPitches] = useState<Record<string, { subject: string; body: string } | "loading" | "error">>({});

  async function hunt() {
    if (!profile || !city || !niche || running) return;
    setRunning(true);
    setResult(null);
    const r = (await prospect({
      profileId: profile._id as any,
      leadType,
      niche,
      city,
      uf: uf || undefined,
    })) as { found: number; upserted: number; error?: string };
    setResult(r.error ? `Erro: ${r.error}` : `${r.found} leads encontrados, ${r.upserted} novos na lista`);
    setRunning(false);
  }

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-4xl sm:text-5xl text-neutral-50">Prospecção</h1>
        <p className="text-sm text-neutral-400">
          Entre com seu email pra carregar seu perfil antes de caçar leads.
        </p>
        {authEnabled && !locked && (
            <a href="/login" className="rounded-xl bg-sky-500 px-4 py-3 text-center font-semibold text-black">
              Entrar com WorkOS &rarr;
            </a>
          )}
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            localStorage.setItem("manager_email", email);
            setEmail(email);
          }}
        >
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            placeholder="seu@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black">
            Entrar
          </button>
        </form>
      </main>
    );
  }

  const grouped = STATUS_ORDER.map((s) => [s, (leads ?? []).filter((l) => l.status === s)] as const)
    .filter(([, ls]) => ls.length > 0);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8">
        <h1 className="text-4xl sm:text-5xl text-neutral-50">Prospecção</h1>
        <p className="mt-1 text-sm text-neutral-400">
          O agente caça quem contrata você — casas de show, festivais, marcas, escolas — e vira funil de carreira.
        </p>
      </header>

      {pending?.length ? (
        <section className="mb-8 rounded-2xl border border-violet-800 bg-violet-950/30 p-5">
          <h2 className="mb-3 text-sm font-bold text-violet-300">
            ⚡ O coach propõe — você decide ({pending.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-900/60 px-4 py-3">
                <div>
                  <p className="text-sm">{p.label}</p>
                  {p.description && <p className="text-xs text-neutral-500">{p.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => applyAction({ id: p._id as any })}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold"
                  >
                    aplicar
                  </button>
                  <button
                    onClick={() => dismissAction({ id: p._id as any })}
                    className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs"
                  >
                    ignorar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mb-8 rounded-2xl border border-neutral-800 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <select
            className="rounded-xl bg-neutral-900 px-4 py-3"
            value={leadType}
            onChange={(e) => setLeadType(e.target.value)}
          >
            {LEAD_TYPES.map((t) => (
              <option key={t} value={t}>{t.replaceAll("_", " ")}</option>
            ))}
          </select>
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            placeholder="nicho (ex: banda de forró)"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
          />
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            placeholder="cidade"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            placeholder="UF"
            maxLength={2}
            value={uf}
            onChange={(e) => setUf(e.target.value.toUpperCase())}
          />
        </div>
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={hunt}
            disabled={running || !city || !niche}
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black disabled:opacity-40"
          >
            {running ? "Caçando…" : "Caçar leads"}
          </button>
          <button
            onClick={async () => {
              const r = await seedMapa({ profileId: profile._id as any });
              setResult(`Mapa de agências: ${r.added} novos leads verificados (agências + feiras de showcase)`);
            }}
            className="rounded-xl border border-emerald-500/50 px-4 py-3 text-sm text-emerald-400"
            title="Planta leads verificados: agências de booking BR + feiras de showcase com inscrição gratuita"
          >
            🗺 Mapa de agências
          </button>
          {result && <p className="font-mono text-xs text-neutral-400">{result}</p>}
        </div>
      </section>

      {leads && leads.length === 0 && !result && (
        <p className="text-sm text-neutral-500">
          Nenhum lead ainda. Define o tipo, o teu nicho e a cidade — o agente traz a lista com contato.
        </p>
      )}

      {grouped.map(([status, ls]) => (
        <section key={status} className="mb-6">
          <h2 className={`mb-3 font-mono text-xs uppercase tracking-widest ${STATUS_STYLE[status]}`}>
            {status} · {ls.length}
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {ls.map((l) => (
              <article key={l._id} className="rounded-2xl border border-neutral-800 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{l.name}</h3>
                    <p className="font-mono text-xs text-neutral-500">
                      {l.kind.replaceAll("_", " ")}
                      {l.city ? ` · ${l.city}${l.uf ? `/${l.uf}` : ""}` : ""}
                    </p>
                  </div>
                  {l.sourceUrl && (
                    <a
                      href={l.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 font-mono text-xs text-emerald-400 hover:underline"
                    >
                      perfil →
                    </a>
                  )}
                </div>
                {l.description && (
                  <p className="mt-2 text-sm text-neutral-400">{l.description}</p>
                )}
                {l.status !== "perdido" && (
                  <button
                    onClick={async () => {
                      setDossierBusy((s) => new Set(s).add(l._id));
                      try {
                        await research({
                          targetType: "lead",
                          id: String(l._id),
                          profileId: profile._id as any,
                          name: l.name,
                          city: l.city,
                          uf: l.uf,
                          kind: l.kind,
                          sourceUrl: l.sourceUrl,
                        });
                      } finally {
                        setDossierBusy((s) => { const n = new Set(s); n.delete(l._id); return n; });
                      }
                    }}
                    className="mt-2 text-xs text-violet-400 hover:underline"
                  >
                    {dossierBusy.has(l._id) ? "🔍 pesquisando…" : l.dossier ? "🔍 refazer dossiê" : "🔍 dossiê OSINT"}
                  </button>
                )}
                {l.dossier && (
                  <details className="mt-2 rounded-lg border border-violet-900/50 bg-violet-950/20 p-3 text-xs">
                    <summary className="cursor-pointer font-semibold text-violet-300">dossiê — quem agenda + rapport</summary>
                    <p className="mt-2 whitespace-pre-wrap text-neutral-400">{l.dossier}</p>
                  </details>
                )}
                {l.contact && (
                  <p className="mt-2 font-mono text-xs text-emerald-300">✉ {l.contact}</p>
                )}
                {l.status !== "perdido" && (
                  <div className="mt-2">
                    {pitches[l._id] === undefined && (
                      <button
                        onClick={async () => {
                          setPitches((p) => ({ ...p, [l._id]: "loading" }));
                          const res = await fetch("/api/pitch", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              profile: { name: profile.name, artAreas: profile.artAreas, bio: profile.bio, portfolioUrl: profile.portfolioUrl },
                              lead: { name: l.name, kind: l.kind, city: l.city, dossier: l.dossier },
                            }),
                          });
                          const data = await res.json();
                          setPitches((p) => ({ ...p, [l._id]: data.error ? "error" : data }));
                        }}
                        className="text-xs text-emerald-400 hover:underline"
                      >
                        ✍ escrever pitch de booking
                      </button>
                    )}
                    {pitches[l._id] === "loading" && <p className="text-xs text-neutral-500">escrevendo…</p>}
                    {pitches[l._id] === "error" && <p className="text-xs text-red-400">falhou — configura LLM_API_KEY</p>}
                    {typeof pitches[l._id] === "object" && (
                      <div className="rounded-lg bg-neutral-900 p-3 text-xs">
                        <p className="font-semibold text-neutral-200">{(pitches[l._id] as any).subject}</p>
                        <p className="mt-1 whitespace-pre-wrap text-neutral-400">{(pitches[l._id] as any).body}</p>
                        <a
                          href={`mailto:${l.contact?.includes("@") ? l.contact : ""}?subject=${encodeURIComponent((pitches[l._id] as any).subject)}&body=${encodeURIComponent((pitches[l._id] as any).body)}`}
                          className="mt-2 inline-block rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-black"
                        >
                          abrir no email →
                        </a>
                      </div>
                    )}
                  </div>
                )}
                {(l.status === "negociando" || l.status === "fechado") && (
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/proposta", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          profile: { name: profile.name, personType: profile.personType, portfolioUrl: profile.portfolioUrl, email: profile.email },
                          lead: { name: l.name, kind: l.kind, city: l.city },
                          gig: {
                            title: `Apresentação — ${l.name}`,
                            date: gigForm?.leadId === l._id ? gigForm.date : undefined,
                            fee: gigForm?.leadId === l._id && gigForm.fee ? Number(gigForm.fee.replace(",", ".")) : undefined,
                          },
                        }),
                      });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      window.open(URL.createObjectURL(blob), "_blank");
                    }}
                    className="mt-2 text-xs text-sky-400 hover:underline"
                  >
                    📄 gerar proposta em PDF
                  </button>
                )}
                {(l.status === "negociando" || l.status === "fechado") && (
                  <button
                    onClick={async () => {
                      const date = gigForm?.leadId === l._id ? gigForm.date : "";
                      const fee = gigForm?.leadId === l._id ? Number(gigForm.fee.replace(",", ".")) : 0;
                      if (!date || !fee) {
                        alert("Preenche a data e o cachê no bloco 'virou trampo?' — o contrato precisa dos dois.");
                        return;
                      }
                      const res = await fetch("/api/contrato", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          profile: { name: profile.name, personType: profile.personType, email: profile.email },
                          lead: { name: l.name, kind: l.kind, city: l.city },
                          gig: { title: `Apresentação — ${l.name}`, date, fee, venue: l.city },
                        }),
                      });
                      if (!res.ok) return;
                      const blob = await res.blob();
                      window.open(URL.createObjectURL(blob), "_blank");
                    }}
                    className="ml-3 mt-2 text-xs text-amber-400 hover:underline"
                  >
                    📝 gerar contrato
                  </button>
                )}
                {l.status === "fechado" && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-950/40 p-2">
                    <span className="text-xs text-emerald-400">virou trampo?</span>
                    <input
                      type="date"
                      className="rounded-lg bg-neutral-900 px-2 py-1 text-xs"
                      value={gigForm?.leadId === l._id ? gigForm.date : ""}
                      onChange={(e) => setGigForm({ leadId: l._id, date: e.target.value, fee: gigForm?.fee ?? "" })}
                    />
                    <input
                      placeholder="R$"
                      className="w-20 rounded-lg bg-neutral-900 px-2 py-1 text-xs"
                      value={gigForm?.leadId === l._id ? gigForm.fee : ""}
                      onChange={(e) => setGigForm({ leadId: l._id, date: gigForm?.date ?? "", fee: e.target.value })}
                    />
                    <button
                      disabled={!gigForm || gigForm.leadId !== l._id || !gigForm.date}
                      onClick={async () => {
                        await addGig({
                          profileId: profile._id as any,
                          leadId: l._id as any,
                          title: l.name,
                          venue: l.city ? `${l.city}${l.uf ? `/${l.uf}` : ""}` : undefined,
                          date: gigForm!.date,
                          fee: gigForm!.fee ? Number(gigForm!.fee.replace(",", ".")) : undefined,
                        });
                        setGigForm(null);
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-black disabled:opacity-40"
                    >
                      + gig
                    </button>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUS_NEXT[l.status] && (
                    <button
                      onClick={() => setStatus({ id: l._id as any, status: STATUS_NEXT[l.status] })}
                      className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs hover:bg-neutral-700"
                    >
                      → {STATUS_NEXT[l.status]}
                    </button>
                  )}
                  {l.status !== "fechado" && l.status !== "perdido" && (
                    <button
                      onClick={() => setStatus({ id: l._id as any, status: "perdido" })}
                      className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-700"
                    >
                      ✕ perdido
                    </button>
                  )}
                  {!contacted.has(l._id) ? (
                    <button
                      onClick={async () => {
                        await addContact({
                          profileId: profile._id as any,
                          name: l.name,
                          org: l.city ? `${l.city}${l.uf ? `/${l.uf}` : ""}` : undefined,
                          role: l.kind.replaceAll("_", " "),
                          email: l.contact?.includes("@") ? l.contact : undefined,
                          phone: l.contact && !l.contact.includes("@") ? l.contact : undefined,
                          notes: `Lead de prospecção${l.sourceUrl ? ` · ${l.sourceUrl}` : ""}`,
                        });
                        setContacted(new Set(contacted).add(l._id));
                      }}
                      className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-800"
                    >
                      + contato
                    </button>
                  ) : (
                    <span className="px-3 py-1.5 text-xs text-emerald-500">✓ contato</span>
                  )}
                  <button
                    onClick={() => removeLead({ id: l._id as any })}
                    className="ml-auto rounded-lg px-3 py-1.5 text-xs text-neutral-600 hover:text-red-400"
                  >
                    remover
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
