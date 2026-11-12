"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import type { PipelineItem, Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";

interface Doc {
  _id: string;
  name: string;
  kind: string;
  expiresAt?: string;
}
interface Contact {
  _id: string;
  name: string;
  role?: string;
  org?: string;
  email?: string;
}

const STAGES: { key: string; label: string }[] = [
  { key: "descoberta", label: "Descoberta" },
  { key: "interessado", label: "Interessado" },
  { key: "inscrito", label: "Inscrito" },
  { key: "ganho", label: "Ganho" },
  { key: "execucao", label: "Em execução" },
  { key: "prestacao", label: "Prestação de contas" },
  { key: "arquivado", label: "Arquivado" },
];

export default function Pipeline() {
  const { email, setEmail, locked, authEnabled } = useAuthEmail();
  const [creating, setCreating] = useState(false);
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile
    | null
    | undefined;
  const upsertProfile = useMutation(api.profiles.upsert);
  const items = useQuery(
    api.pipeline.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as PipelineItem[] | undefined;
  const move = useMutation(api.pipeline.move);
  const docs = useQuery(
    api.documents.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as Doc[] | undefined;
  const contacts = useQuery(
    api.contacts.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as Contact[] | undefined;
  const addDoc = useMutation(api.documents.add);
  const addContact = useMutation(api.contacts.add);
  const [docForm, setDocForm] = useState({ name: "", kind: "certidão", expiresAt: "" });
  const [contactForm, setContactForm] = useState({ name: "", role: "", org: "" });

  function daysUntil(iso?: string) {
    if (!iso) return null;
    return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  }

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-4xl sm:text-5xl text-neutral-50">Seu pipeline de carreira</h1>
        <p className="text-sm text-neutral-400">
          Entre com seu email pra criar (ou achar) seu perfil de artista.
        </p>
        {authEnabled && !locked && (
            <a href="/login" className="rounded-xl bg-sky-500 px-4 py-3 text-center font-semibold text-black">
              Entrar com WorkOS &rarr;
            </a>
          )}
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!email || creating) return;
            setCreating(true);
            await upsertProfile({
              name: email.split("@")[0],
              email,
              personType: "Pessoa Física",
              artAreas: [],
            });
            localStorage.setItem("manager_email", email);
            setCreating(false);
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
            {creating ? "Abrindo…" : "Entrar"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl text-neutral-50">Pipeline de {profile.name}</h1>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/prestacao" className="text-amber-400 hover:underline">
            Prestação →
          </Link>
          <Link href="/oportunidades" className="text-emerald-400 hover:underline">
            + Oportunidades
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
        {STAGES.map((s) => (
          <div key={s.key} className="rounded-2xl border border-neutral-800 p-3">
            <h2 className="mb-3 font-mono text-xs uppercase tracking-wider text-neutral-400">
              {s.label}
            </h2>
            <div className="flex flex-col gap-2">
              {!items ? (
                <p className="text-xs text-neutral-600">…</p>
              ) : (
                items
                  .filter((i) => i.stage === s.key)
                  .map((i) => (
                    <div
                      key={i._id}
                      className="rounded-xl bg-neutral-900 p-3 text-sm"
                    >
                      <p className="font-medium leading-snug">
                        {i.opportunity!.name}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {i.opportunity!.sourceName}
                      </p>
                      {i.sabatinaScore != null && (
                        <p className="mt-1 text-xs font-bold text-emerald-400">
                          Banca: {i.sabatinaScore}/100
                        </p>
                      )}
                      <select
                        className="mt-2 w-full rounded bg-neutral-800 px-1 py-1 text-xs"
                        value={i.stage}
                        onChange={(e) =>
                          move({ id: i._id as Id<"pipelineItems">, stage: e.target.value })
                        }
                      >
                        {STAGES.map((x) => (
                          <option key={x.key} value={x.key}>
                            {x.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-neutral-800 p-5">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-400">
            Documentos
          </h2>
          <ul className="mb-4 flex flex-col gap-2">
            {(docs ?? []).map((d) => {
              const days = daysUntil(d.expiresAt);
              return (
                <li
                  key={d._id}
                  className="flex items-center justify-between rounded-xl bg-neutral-900 px-3 py-2 text-sm"
                >
                  <span>
                    {d.name} <span className="text-neutral-500">· {d.kind}</span>
                  </span>
                  {days !== null && (
                    <span
                      className={`text-xs ${days <= 30 ? "text-red-400" : "text-neutral-500"}`}
                    >
                      {days <= 0 ? "vencido" : `vence em ${days}d`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!docForm.name) return;
              await addDoc({
                profileId: profile._id as any,
                name: docForm.name,
                kind: docForm.kind,
                expiresAt: docForm.expiresAt || undefined,
              });
              setDocForm({ name: "", kind: "certidão", expiresAt: "" });
            }}
          >
            <input
              className="flex-1 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs"
              placeholder="Nome (ex: Certidão FGTS)"
              value={docForm.name}
              onChange={(e) => setDocForm({ ...docForm, name: e.target.value })}
            />
            <input
              className="w-28 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs"
              type="date"
              value={docForm.expiresAt}
              onChange={(e) => setDocForm({ ...docForm, expiresAt: e.target.value })}
            />
            <button className="rounded-lg bg-emerald-600 px-3 text-xs font-semibold">+</button>
          </form>
        </section>

        <section className="rounded-2xl border border-neutral-800 p-5">
          <h2 className="mb-4 font-mono text-xs uppercase tracking-wider text-neutral-400">
            Contatos
          </h2>
          <ul className="mb-4 flex flex-col gap-2">
            {(contacts ?? []).map((c) => (
              <li key={c._id} className="rounded-xl bg-neutral-900 px-3 py-2 text-sm">
                {c.name}
                <span className="text-neutral-500">
                  {c.role ? ` · ${c.role}` : ""}
                  {c.org ? ` · ${c.org}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!contactForm.name) return;
              await addContact({
                profileId: profile._id as any,
                name: contactForm.name,
                role: contactForm.role || undefined,
                org: contactForm.org || undefined,
              });
              setContactForm({ name: "", role: "", org: "" });
            }}
          >
            <input
              className="flex-1 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs"
              placeholder="Nome"
              value={contactForm.name}
              onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            />
            <input
              className="w-24 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs"
              placeholder="Papel"
              value={contactForm.role}
              onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
            />
            <input
              className="w-28 rounded-lg bg-neutral-900 px-2 py-1.5 text-xs"
              placeholder="Org"
              value={contactForm.org}
              onChange={(e) => setContactForm({ ...contactForm, org: e.target.value })}
            />
            <button className="rounded-lg bg-emerald-600 px-3 text-xs font-semibold">+</button>
          </form>
        </section>
      </div>
    </main>
  );
}
