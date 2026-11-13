"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import { SignIn } from "@/components/SignIn";
import { RichText } from "@/lib/format";
import { Button, Card, EmptyState, Field, Input, Notice, Page, PageHeader, SectionTitle, Select, Skeleton } from "@/components/ui";

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

const KIND_LABEL: Record<string, string> = {
  casa_de_show: "Casas de show",
  festival: "Festivais",
  marca: "Marcas",
  escola: "Escolas",
  produtora: "Produtoras",
  agencia: "Agências",
  prefeitura: "Prefeituras",
  outro: "Outros",
};

const STATUS_ORDER = ["novo", "contatado", "respondeu", "negociando", "fechado", "perdido"];
const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  contatado: "Abordado",
  respondeu: "Respondeu",
  negociando: "Negociando",
  fechado: "Fechado",
  perdido: "Não rolou",
};
const STATUS_TONE: Record<string, string> = {
  novo: "border-neutral-700 text-neutral-200",
  contatado: "border-amber-500/40 text-amber-300",
  respondeu: "border-violet-500/40 text-violet-300",
  negociando: "border-emerald-500/40 text-emerald-300",
  fechado: "border-emerald-400 text-emerald-300",
  perdido: "border-neutral-800 text-neutral-500",
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
  const { email, token, ready } = useAuthEmail();
  const profile = useMyProfile();
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
  const mapAgency = useAction(api.discover.mapAgency);
  const [agencyMsg, setAgencyMsg] = useState<Record<string, string>>({});
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
  const [filter, setFilter] = useState<string>("ativos");
  const [elapsed, setElapsed] = useState(0);
  const [docErr, setDocErr] = useState<{ id: string; msg: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [agendado, setAgendado] = useState<Set<string>>(new Set());
  const [prefilled, setPrefilled] = useState(false);

  // o formulário já vem com o que o perfil sabe (cidade, UF, área)
  useEffect(() => {
    if (!profile || prefilled) return;
    setPrefilled(true);
    if (profile.city) setCity(profile.city);
    if (profile.uf) setUf(profile.uf);
    if (profile.artAreas?.length) setNiche(profile.artAreas.slice(0, 2).join(" e ").toLowerCase());
  }, [profile, prefilled]);

  useEffect(() => {
    if (!running) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  async function hunt() {
    if (!profile || !city.trim() || !niche.trim() || running) return;
    setRunning(true);
    setResult(null);
    try {
      const r = (await prospect({
        profileId: profile._id as any,
        leadType,
        niche: niche.trim(),
        city: city.trim(),
        uf: uf || undefined,
      })) as { found: number; upserted: number; error?: string };
      setResult(
        r.error
          ? "Não deu pra concluir a pesquisa agora. Tenta de novo, ou descreve o que você oferece de um jeito mais específico."
          : r.found === 0
            ? "Não achei contratantes com esse perfil. Tenta outro tipo ou uma cidade maior por perto."
            : `${r.found} ${r.found === 1 ? "contratante encontrado" : "contratantes encontrados"}. Estão na lista abaixo, prontos pra abordar.`
      );
    } catch {
      setResult("Não deu pra concluir a pesquisa agora. Tenta de novo em instantes.");
    } finally {
      setRunning(false);
    }
  }

  if (!profile) {
    return (
      <SignIn
        title="Prospecção"
        blurb="O agente caça quem contrata você e monta teu funil comercial."
        profile={profile}
      />
    );
  }

  const all = leads ?? [];
  const counts = Object.fromEntries(STATUS_ORDER.map((st) => [st, all.filter((l) => l.status === st).length]));
  const shown = filter === "ativos" ? all.filter((l) => l.status !== "perdido" && l.status !== "fechado") : all.filter((l) => l.status === filter);
  const num = (v: string) => Number(v.replace(/\./g, "").replace(",", "."));

  async function openPdf(url: string, body: unknown, leadId: string) {
    setDocErr(null);
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) {
      setDocErr({ id: leadId, msg: "Não deu pra gerar o documento agora. Tenta de novo." });
      return;
    }
    window.open(URL.createObjectURL(await res.blob()), "_blank");
  }

  const leadCard = (l: Lead) => {
    const place = l.city ? `${l.city}${l.uf ? `/${l.uf}` : ""}` : "";
    const pitch = pitches[l._id];
    const emailTo = l.contact?.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
    const phone = l.contact?.match(/\(?\d{2}\)?\s?9?\d{4}[-\s]?\d{4}/)?.[0]?.replace(/\D/g, "");
    const deal = gigForm?.leadId === l._id ? gigForm : { leadId: l._id, date: "", fee: "" };
    const closing = l.status === "negociando" || l.status === "fechado";
    return (
      <li key={l._id} className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-neutral-50">{l.name}</h3>
            <p className="mt-0.5 text-xs text-neutral-500">{[KIND_LABEL[l.kind] ?? l.kind.replaceAll("_", " "), place].filter(Boolean).join(" · ")}</p>
          </div>
          <label className="sr-only" htmlFor={`ls-${l._id}`}>Situação de {l.name}</label>
          <select
            id={`ls-${l._id}`}
            value={l.status}
            onChange={(e) => setStatus({ id: l._id as any, status: e.target.value })}
            className={`h-8 shrink-0 rounded-full border bg-neutral-950 px-2.5 text-xs font-medium ${STATUS_TONE[l.status] ?? ""}`}
          >
            {STATUS_ORDER.map((st) => (
              <option key={st} value={st}>{STATUS_LABEL[st]}</option>
            ))}
          </select>
        </div>

        {l.description && <p className="mt-3 text-sm leading-relaxed text-neutral-300">{l.description}</p>}

        {(l.contact || l.sourceUrl) && (
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {l.contact && <span className="break-words text-neutral-200">{l.contact}</span>}
            {l.sourceUrl && (
              <a href={l.sourceUrl} target="_blank" rel="noreferrer" className="text-emerald-300 underline underline-offset-2">
                Ver site ou perfil
              </a>
            )}
          </div>
        )}

        {l.dossier && (
          <details className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-neutral-200">Dossiê: quem agenda e como chegar</summary>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-neutral-400"><RichText text={l.dossier} /></p>
          </details>
        )}

        {typeof pitch === "object" && (
          <div className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 text-sm">
            <p className="font-semibold text-neutral-50">{pitch.subject}</p>
            <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-neutral-300">{pitch.body}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={async () => { await navigator.clipboard.writeText(`${pitch.subject}\n\n${pitch.body}`).catch(() => {}); setCopied(l._id); setTimeout(() => setCopied(null), 2000); }}>
                {copied === l._id ? "Copiado" : "Copiar texto"}
              </Button>
              {emailTo && (
                <a className="inline-flex h-8 items-center rounded-full bg-emerald-400 px-3 text-xs font-semibold text-neutral-950 hover:bg-emerald-300" href={`mailto:${emailTo}?subject=${encodeURIComponent(pitch.subject)}&body=${encodeURIComponent(pitch.body)}`}>
                  Abrir no e-mail
                </a>
              )}
              {phone && (
                <a className="inline-flex h-8 items-center rounded-full border border-neutral-700 px-3 text-xs font-medium text-neutral-100 hover:border-neutral-500" target="_blank" rel="noreferrer" href={`https://wa.me/55${phone}?text=${encodeURIComponent(pitch.body)}`}>
                  Mandar no WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
        {pitch === "error" && <p className="mt-3 text-sm text-red-300">Não consegui escrever agora. Tenta de novo em instantes.</p>}

        {closing && (
          <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
            <p className="text-sm font-medium text-neutral-100">{l.status === "fechado" ? "Fechou. Registra a data e o cachê:" : "Negociando. Com data e cachê eu monto os documentos:"}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Data">
                <Input type="date" value={deal.date} onChange={(e) => setGigForm({ ...deal, date: e.target.value })} />
              </Field>
              <Field label="Cachê (R$)">
                <Input inputMode="decimal" placeholder="1.500" value={deal.fee} onChange={(e) => setGigForm({ ...deal, fee: e.target.value.replace(/[^\d.,]/g, "") })} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => openPdf("/api/proposta", {
                profile: { name: profile.name, personType: profile.personType, portfolioUrl: profile.portfolioUrl, email: profile.email },
                lead: { name: l.name, kind: l.kind, city: l.city },
                gig: { title: `Apresentação: ${l.name}`, date: deal.date || undefined, fee: deal.fee ? num(deal.fee) : undefined },
              }, l._id)}>
                Proposta em PDF
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                if (!deal.date || !deal.fee) { setDocErr({ id: l._id, msg: "O contrato precisa da data e do cachê. Preenche os dois acima." }); return; }
                void openPdf("/api/contrato", {
                  profile: { name: profile.name, personType: profile.personType, email: profile.email },
                  lead: { name: l.name, kind: l.kind, city: l.city },
                  gig: { title: `Apresentação: ${l.name}`, date: deal.date, fee: num(deal.fee), venue: l.city },
                }, l._id);
              }}>
                Contrato em PDF
              </Button>
              {l.status === "fechado" && (
                <Button size="sm" disabled={!deal.date} onClick={async () => {
                  await addGig({ profileId: profile._id as any, leadId: l._id as any, title: l.name, venue: place || undefined, date: deal.date, fee: deal.fee ? num(deal.fee) : undefined });
                  setGigForm(null);
                  setAgendado((s) => new Set(s).add(l._id));
                }}>
                  {agendado.has(l._id) ? "Está na agenda" : "Pôr na agenda"}
                </Button>
              )}
            </div>
            {docErr?.id === l._id && <p className="mt-2 text-sm text-red-300">{docErr.msg}</p>}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3.5">
          {l.status !== "perdido" && typeof pitch !== "object" && (
            <Button size="sm" loading={pitch === "loading"} onClick={async () => {
              setPitches((p) => ({ ...p, [l._id]: "loading" }));
              try {
                const res = await fetch("/api/pitch", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    profile: { name: profile.name, artAreas: profile.artAreas, bio: profile.bio, portfolioUrl: profile.portfolioUrl },
                    lead: { name: l.name, kind: l.kind, city: l.city, dossier: l.dossier },
                  }),
                });
                const data = await res.json();
                setPitches((p) => ({ ...p, [l._id]: !res.ok || data.error ? "error" : data }));
              } catch {
                setPitches((p) => ({ ...p, [l._id]: "error" }));
              }
            }}>
              Escrever abordagem
            </Button>
          )}
          {l.status !== "perdido" && (
            <Button size="sm" variant="ghost" loading={dossierBusy.has(l._id)} onClick={async () => {
              setDossierBusy((st) => new Set(st).add(l._id));
              try {
                await research({ targetType: "lead", id: String(l._id), profileId: profile._id as any, name: l.name, city: l.city, uf: l.uf, kind: l.kind, sourceUrl: l.sourceUrl });
              } catch {
                setDocErr({ id: l._id, msg: "A pesquisa não voltou. Tenta de novo." });
              } finally {
                setDossierBusy((st) => { const n = new Set(st); n.delete(l._id); return n; });
              }
            }}>
              {dossierBusy.has(l._id) ? "Pesquisando" : l.dossier ? "Refazer dossiê" : "Quem agenda?"}
            </Button>
          )}
          {l.kind === "agencia" && (
            <Button size="sm" variant="ghost" loading={agencyMsg[l._id] === "…"} onClick={async () => {
              setAgencyMsg((m) => ({ ...m, [l._id]: "…" }));
              try {
                const r = (await mapAgency({ profileId: profile._id as any, agency: l.name, niche: niche.trim() || "música", region: uf || undefined })) as { artists: string[]; found: number; error?: string };
                setAgencyMsg((m) => ({
                  ...m,
                  [l._id]: r.error
                    ? "Não deu pra mapear agora. Tenta de novo."
                    : r.found
                      ? `${r.found} contratantes de ${r.artists.slice(0, 3).join(", ")}${r.artists.length > 3 ? " e outros" : ""} entraram na lista.`
                      : "Não achei contratantes verificáveis pelo casting dessa agência.",
                }));
              } catch {
                setAgencyMsg((m) => ({ ...m, [l._id]: "Não deu pra mapear agora. Tenta de novo." }));
              }
            }}>
              {agencyMsg[l._id] === "…" ? "Lendo o casting (2 a 4 min)" : "Onde o casting dela toca?"}
            </Button>
          )}
          {agencyMsg[l._id] && agencyMsg[l._id] !== "…" && <p className="w-full text-xs text-neutral-400">{agencyMsg[l._id]}</p>}
          {contacted.has(l._id) ? (
            <span className="px-2 text-xs text-emerald-300">Salvo nos contatos</span>
          ) : (
            <Button size="sm" variant="ghost" onClick={async () => {
              await addContact({
                profileId: profile._id as any,
                name: l.name,
                org: place || undefined,
                role: KIND_LABEL[l.kind] ?? l.kind.replaceAll("_", " "),
                email: emailTo,
                phone: !emailTo && l.contact ? l.contact : undefined,
                notes: `Lead de prospecção${l.sourceUrl ? ` · ${l.sourceUrl}` : ""}`,
              });
              setContacted(new Set(contacted).add(l._id));
            }}>
              Salvar contato
            </Button>
          )}
          <span className="flex-1" />
          {confirmDel === l._id ? (
            <>
              <Button size="sm" variant="danger" onClick={async () => { await removeLead({ id: l._id as any }); setConfirmDel(null); }}>Remover</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDel(null)}>Manter</Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setConfirmDel(l._id)}>Remover</Button>
          )}
        </div>
        {docErr?.id === l._id && !closing && <p className="mt-2 text-sm text-red-300">{docErr.msg}</p>}
      </li>
    );
  };

  return (
    <Page>
      <PageHeader
        title="Prospecção"
        description="O agente pesquisa quem contrata gente como você na tua cidade e traz com contato. Você aborda, negocia e fecha por aqui."
      />

      {pending?.length ? (
        <Card as="section" className="mb-6 border-violet-500/40">
          <SectionTitle>O coach sugere ({pending.length})</SectionTitle>
          <ul className="flex flex-col divide-y divide-neutral-800">
            {pending.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-100">{p.label}</p>
                  {p.description && <p className="text-xs text-neutral-500">{p.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => applyAction({ id: p._id as any })}>Aplicar</Button>
                  <Button size="sm" variant="ghost" onClick={() => dismissAction({ id: p._id as any })}>Ignorar</Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card as="section" className="mb-8">
        <SectionTitle>Caçar contratantes</SectionTitle>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.4fr_1.1fr_5.5rem]"
          onSubmit={(e) => { e.preventDefault(); void hunt(); }}
        >
          <Field label="Quem você procura">
            <Select value={leadType} onChange={(e) => setLeadType(e.target.value)}>
              {LEAD_TYPES.map((t) => (
                <option key={t} value={t}>{KIND_LABEL[t]}</option>
              ))}
            </Select>
          </Field>
          <Field label="O que você oferece">
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="Ex.: trio de forró pé de serra" />
          </Field>
          <Field label="Cidade">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Campinas" />
          </Field>
          <Field label="UF">
            <Input maxLength={2} value={uf} onChange={(e) => setUf(e.target.value.toUpperCase())} placeholder="SP" />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={running} disabled={!city.trim() || !niche.trim()}>
              {running ? "Pesquisando" : "Caçar leads"}
            </Button>
            <Button type="button" variant="ghost" disabled={running} onClick={async () => {
              const r = await seedMapa({ profileId: profile._id as any });
              setResult(r.added ? `${r.added} agências de booking e feiras de showcase entraram na tua lista.` : "As agências e feiras verificadas já estão na tua lista.");
            }}>
              Adicionar agências e feiras verificadas
            </Button>
          </div>
        </form>

        {running && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4" role="status" aria-live="polite">
            <div className="flex items-center justify-between gap-3 text-sm">
              <p className="font-medium text-neutral-100">
                Pesquisando {KIND_LABEL[leadType]?.toLowerCase()} em {city}. Isso leva de 1 a 2 minutos.
              </p>
              <span className="shrink-0 font-mono text-xs text-neutral-400">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-800">
              <div className="h-1.5 rounded-full bg-emerald-400 transition-[width] duration-1000" style={{ width: `${Math.min(95, (elapsed / 110) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-neutral-500">O agente está abrindo sites e perfis reais pra confirmar que existem e achar o contato. Pode deixar esta aba aberta.</p>
          </div>
        )}
        {!running && result && (
          <div className="mt-5"><Notice tone={result.startsWith("Não") ? "bad" : "good"}>{result}</Notice></div>
        )}
      </Card>

      {leads === undefined ? (
        <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : all.length === 0 ? (
        <EmptyState icon="📡" title="Nenhum contratante na lista ainda">
          Diz o que você oferece e a cidade no formulário acima. Em 2 minutos você tem casas, festivais ou escolas com contato pra abordar.
        </EmptyState>
      ) : (
        <>
          <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1" role="group" aria-label="Filtrar por situação">
            {[{ id: "ativos", label: `Em aberto (${all.filter((l) => l.status !== "perdido" && l.status !== "fechado").length})` }, ...STATUS_ORDER.filter((st) => counts[st] > 0).map((st) => ({ id: st, label: `${STATUS_LABEL[st]} (${counts[st]})` }))].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${filter === f.id ? "bg-neutral-800 text-neutral-50" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {shown.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">Nenhum lead nessa situação.</p>
          ) : (
            <ul className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">{shown.map(leadCard)}</ul>
          )}
        </>
      )}
    </Page>
  );
}
