"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import { useState } from "react";
import type { PipelineItem, Profile } from "@/lib/types";

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
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("manager_email") ?? "" : ""
  );
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

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Seu pipeline de carreira</h1>
        <p className="text-sm text-neutral-400">
          Entre com seu email pra criar (ou achar) seu perfil de artista.
        </p>
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
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <Link href="/" className="font-mono text-xs text-emerald-400">
            manager_
          </Link>
          <h1 className="text-3xl font-bold">Pipeline de {profile.name}</h1>
        </div>
        <Link href="/oportunidades" className="text-sm text-emerald-400 hover:underline">
          + Oportunidades
        </Link>
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
    </main>
  );
}
