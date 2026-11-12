"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { PipelineItem, Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import { tidyTitle } from "@/lib/format";
import { SignIn } from "@/components/SignIn";
import { Badge, Button, Card, EmptyState, Field, Input, LinkButton, Page, PageHeader, SectionTitle, Skeleton, brl, diasAte } from "@/components/ui";

interface Contact {
  _id: string;
  name: string;
  role?: string;
  org?: string;
  email?: string;
}

// Cada etapa diz o que fazer nela — o funil ensina o caminho do edital.
const STAGES: { key: string; label: string; hint: string }[] = [
  { key: "descoberta", label: "Descoberta", hint: "Achei, ainda vou ler" },
  { key: "interessado", label: "Vou inscrever", hint: "Preparando proposta e documentos" },
  { key: "inscrito", label: "Inscrito", hint: "Aguardando resultado" },
  { key: "ganho", label: "Aprovado", hint: "Assinar termo e receber" },
  { key: "execucao", label: "Em execução", hint: "Projeto rodando" },
  { key: "prestacao", label: "Prestação de contas", hint: "Relatório e comprovantes" },
];
const ALL = [...STAGES, { key: "arquivado", label: "Arquivado", hint: "" }];

export default function Pipeline() {
  const { email, token, ready } = useAuthEmail();
  const profile = useMyProfile();
  const items = useQuery(api.pipeline.listForProfile, profile ? { profileId: profile._id as any } : "skip") as PipelineItem[] | undefined;
  const contacts = useQuery(api.contacts.listForProfile, profile ? { profileId: profile._id as any } : "skip") as Contact[] | undefined;
  const move = useMutation(api.pipeline.move);
  const remove = useMutation(api.pipeline.remove);
  const addContact = useMutation(api.contacts.add);
  const [contactForm, setContactForm] = useState({ name: "", role: "", org: "" });
  const [showArchived, setShowArchived] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  if (!profile) {
    return (
      <SignIn
        title="Teu pipeline"
        blurb="Editais e propostas num funil só, do interesse à prestação de contas."
        profile={profile}
      />
    );
  }

  const live = (items ?? []).filter((i) => i.stage !== "arquivado");
  const archived = (items ?? []).filter((i) => i.stage === "arquivado");
  const emJogo = live
    .filter((i) => ["interessado", "inscrito"].includes(i.stage))
    .reduce((s, i) => s + (i.opportunity?.totalResource ?? 0), 0);

  const card = (i: PipelineItem) => {
    const o = i.opportunity!;
    const dias = diasAte(o.registrationTo);
    const prazoVale = ["descoberta", "interessado"].includes(i.stage) && dias !== null;
    return (
      <li key={i._id} className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3.5">
        <Link href={`/sabatina/${o._id}`} className="block text-sm font-semibold leading-snug text-neutral-50 hover:text-emerald-300">
          <span className="line-clamp-3">{tidyTitle(o.name)}</span>
        </Link>
        <p className="mt-1 truncate text-xs text-neutral-500">{o.sourceName}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {prazoVale && (
            <Badge tone={dias! < 0 ? "neutral" : dias! <= 3 ? "bad" : dias! <= 10 ? "warn" : "neutral"}>
              {dias! < 0 ? "inscrição encerrada" : dias === 0 ? "fecha hoje" : dias === 1 ? "fecha amanhã" : `${dias} dias`}
            </Badge>
          )}
          {i.sabatinaScore != null && (
            <Badge tone={i.sabatinaScore >= 70 ? "good" : i.sabatinaScore >= 50 ? "warn" : "bad"}>banca {i.sabatinaScore}/100</Badge>
          )}
          {o.totalResource ? <Badge>{brl(o.totalResource)}</Badge> : null}
        </div>
        {i.sabatinaScore == null && ["descoberta", "interessado"].includes(i.stage) && (
          <Link href={`/sabatina/${o._id}`} className="mt-2.5 inline-block text-xs font-semibold text-emerald-300 hover:underline">
            Testar na banca antes de inscrever
          </Link>
        )}
        {i.stage === "prestacao" && (
          <Link href="/prestacao" className="mt-2.5 inline-block text-xs font-semibold text-emerald-300 hover:underline">
            Montar relatório de execução
          </Link>
        )}
        <div className="mt-3 flex items-center gap-2 border-t border-neutral-800 pt-3">
          <label className="sr-only" htmlFor={`st-${i._id}`}>Etapa de {o.name}</label>
          <select
            id={`st-${i._id}`}
            className="h-8 min-w-0 flex-1 rounded-lg bg-neutral-950 px-2 text-xs"
            value={i.stage}
            onChange={(e) => move({ id: i._id as Id<"pipelineItems">, stage: e.target.value })}
          >
            {ALL.map((x) => (
              <option key={x.key} value={x.key}>
                {x.label}
              </option>
            ))}
          </select>
          {confirmDel === i._id ? (
            <>
              <Button size="sm" variant="danger" onClick={async () => { await remove({ id: i._id as Id<"pipelineItems"> }); setConfirmDel(null); }}>
                Tirar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDel(null)}>
                Não
              </Button>
            </>
          ) : (
            <button onClick={() => setConfirmDel(i._id)} aria-label={`Tirar ${o.name} do pipeline`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-800 hover:text-neutral-200">
              ✕
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <Page width="max-w-7xl">
      <PageHeader
        title="Teu pipeline"
        description={
          live.length
            ? `${live.length} ${live.length === 1 ? "edital" : "editais"} em andamento${emJogo ? ` · ${brl(emJogo)} em disputa` : ""}.`
            : "Do edital que você achou até a prestação de contas, cada um na sua etapa."
        }
        actions={
          <>
            <LinkButton href="/documentos" variant="secondary">Documentos</LinkButton>
            <LinkButton href="/oportunidades">Adicionar edital</LinkButton>
          </>
        }
      />

      {items === undefined ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          {STAGES.map((s) => <Skeleton key={s.key} className="h-48" />)}
        </div>
      ) : live.length === 0 && archived.length === 0 ? (
        <EmptyState icon="🧭" title="Teu pipeline está vazio" action={<LinkButton href="/oportunidades">Abrir o radar de editais</LinkButton>}>
          Escolhe no radar os editais que fazem sentido e clica em “+ pipeline”. Eles aparecem aqui, com prazo e nota da banca.
        </EmptyState>
      ) : (
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
          <div className="grid min-w-[72rem] grid-cols-6 gap-3 xl:min-w-0">
            {STAGES.map((s) => {
              const col = live.filter((i) => i.stage === s.key);
              return (
                <section key={s.key} aria-label={s.label} className="flex min-w-0 flex-col rounded-2xl bg-neutral-900/40 p-2.5">
                  <div className="mb-2.5 px-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-neutral-100">{s.label}</h2>
                      <span className="text-xs text-neutral-500">{col.length}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">{s.hint}</p>
                  </div>
                  {col.length ? (
                    <ul className="flex flex-col gap-2">{col.map(card)}</ul>
                  ) : (
                    <div className="rounded-xl border border-dashed border-neutral-800 px-3 py-6 text-center text-xs text-neutral-600">vazio</div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}

      {archived.length > 0 && (
        <div className="mt-6">
          <Button variant="ghost" size="sm" onClick={() => setShowArchived((v) => !v)} aria-expanded={showArchived}>
            {showArchived ? "Esconder" : "Mostrar"} arquivados ({archived.length})
          </Button>
          {showArchived && <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{archived.map(card)}</ul>}
        </div>
      )}

      <Card as="section" className="mt-10 max-w-2xl">
        <SectionTitle>Contatos de edital</SectionTitle>
        <p className="mb-4 text-sm text-neutral-400">Parecerista, gestor de cultura, produtor: quem você precisa lembrar quando abrir a próxima chamada.</p>
        {(contacts ?? []).length > 0 && (
          <ul className="mb-4 flex flex-col divide-y divide-neutral-800">
            {(contacts ?? []).map((c) => (
              <li key={c._id} className="flex flex-wrap items-baseline gap-x-2 py-2 text-sm">
                <span className="font-medium text-neutral-100">{c.name}</span>
                <span className="text-neutral-500">{[c.role, c.org].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
        <form
          className="grid gap-3 sm:grid-cols-[1.3fr_1fr_1fr_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!contactForm.name.trim()) return;
            await addContact({
              profileId: profile._id as any,
              name: contactForm.name.trim(),
              role: contactForm.role || undefined,
              org: contactForm.org || undefined,
            });
            setContactForm({ name: "", role: "", org: "" });
          }}
        >
          <Field label="Nome">
            <Input value={contactForm.name} onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })} placeholder="Ex.: Ana Souza" />
          </Field>
          <Field label="Função">
            <Input value={contactForm.role} onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })} placeholder="Gestora" />
          </Field>
          <Field label="Onde">
            <Input value={contactForm.org} onChange={(e) => setContactForm({ ...contactForm, org: e.target.value })} placeholder="Sec. de Cultura" />
          </Field>
          <Button type="submit" variant="secondary" className="h-11">
            Adicionar
          </Button>
        </form>
      </Card>
    </Page>
  );
}
