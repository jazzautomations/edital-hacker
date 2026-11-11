"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { personTypeMatches, type Opportunity, type Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";

function deadlineBadge(registrationTo?: string) {
  if (!registrationTo) return null;
  const days = Math.ceil(
    (new Date(registrationTo).getTime() - Date.now()) / 86_400_000
  );
  const color =
    days <= 3 ? "text-red-400" : days <= 10 ? "text-amber-400" : "text-emerald-400";
  return (
    <span className={`font-mono text-xs ${color}`}>
      {days}d · até {registrationTo.slice(0, 10)}
    </span>
  );
}

export default function Oportunidades() {
  const { email } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile | null | undefined;
  const addToPipeline = useMutation(api.pipeline.add);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const opps = useQuery(api.opportunities.list, {
    limit: 100,
  }) as Opportunity[] | undefined;
  const bySource = useQuery(api.opportunities.countBySource) as
    | { source: string; count: number }[]
    | undefined;

  function eligibilityOf(o: Opportunity): "ok" | "warn" | null {
    if (!profile || o.proponentTypes.length === 0) return null;
    return personTypeMatches(profile.personType, o.proponentTypes) ? "ok" : "warn";
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <Link href="/" className="font-mono text-xs text-emerald-400">
            manager_
          </Link>
          <h1 className="text-3xl font-bold">Oportunidades abertas</h1>
          {bySource && (
            <p className="mt-1 text-sm text-neutral-400">
              {bySource.reduce((a, b) => a + b.count, 0)} oportunidades ·{" "}
              {bySource.length} fontes
            </p>
          )}
        </div>
        <div className="flex gap-4">
          <Link href="/prospeccao" className="text-sm text-emerald-400 hover:underline">
            Prospecção →
          </Link>
          <Link href="/pipeline" className="text-sm text-emerald-400 hover:underline">
            Pipeline →
          </Link>
        </div>
      </header>

      {!opps ? (
        <p className="text-neutral-500">Carregando…</p>
      ) : opps.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 p-8 text-center text-neutral-400">
          Nenhuma oportunidade no banco ainda.
          <br />
          <span className="font-mono text-xs">
            Rode a ingestão: npx convex run ingest:run
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {opps.map((o) => (
            <li
              key={o._id}
              className="flex flex-col gap-2 rounded-2xl border border-neutral-800 p-5 transition hover:border-neutral-600"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/sabatina/${o._id}`}
                    className="text-lg font-semibold hover:text-emerald-400"
                  >
                    {o.name}
                  </Link>
                  <p className="text-sm text-neutral-400">
                    {o.sourceName}
                    {o.totalResource
                      ? ` · até R$ ${o.totalResource.toLocaleString("pt-BR")}`
                      : ""}
                  </p>
                </div>
                {deadlineBadge(o.registrationTo)}
              </div>
              {o.shortDescription && (
                <p className="line-clamp-2 text-sm text-neutral-400">
                  {o.shortDescription}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {eligibilityOf(o) === "ok" && (
                  <span className="rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-300">
                    aceita você ✓
                  </span>
                )}
                {eligibilityOf(o) === "warn" && (
                  <span className="rounded-full bg-red-900/60 px-2 py-0.5 text-xs text-red-300">
                    pode não aceitar {profile!.personType}
                  </span>
                )}
                {!o.enriched && (
                  <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs text-amber-300">
                    análise parcial
                  </span>
                )}
                {o.proponentTypes.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-neutral-800 px-2 py-0.5 text-xs"
                  >
                    {t}
                  </span>
                ))}
                {o.categories.slice(0, 4).map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-neutral-800/60 px-2 py-0.5 text-xs text-neutral-400"
                  >
                    {c}
                  </span>
                ))}
                {o.registrationLimitPerOwner != null &&
                  o.registrationLimitPerOwner > 0 && (
                    <span className="rounded-full bg-orange-900/50 px-2 py-0.5 text-xs text-orange-300">
                      máx {o.registrationLimitPerOwner} proposta
                      {o.registrationLimitPerOwner > 1 ? "s" : ""}/proponente
                    </span>
                  )}
                {profile && (
                  <button
                    onClick={async () => {
                      await addToPipeline({
                        profileId: profile._id as any,
                        opportunityId: o._id as any,
                        stage: "interessado",
                      });
                      setAdded((s) => new Set(s).add(o._id));
                    }}
                    className="ml-auto rounded-lg bg-neutral-800 px-3 py-1 text-xs font-semibold hover:bg-neutral-700"
                  >
                    {added.has(o._id) ? "No pipeline ✓" : "+ pipeline"}
                  </button>
                )}
                <Link
                  href={`/sabatina/${o._id}`}
                  className={`${profile ? "" : "ml-auto"} rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20`}
                >
                  Sabatinar →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
