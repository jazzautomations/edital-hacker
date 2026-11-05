"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import type { Opportunity } from "@/lib/types";

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
  const opps = useQuery(api.opportunities.list, {
    limit: 100,
  }) as Opportunity[] | undefined;
  const bySource = useQuery(api.opportunities.countBySource) as
    | Record<string, number>
    | undefined;

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
              {Object.values(bySource).reduce((a, b) => a + b, 0)} oportunidades ·{" "}
              {Object.keys(bySource).length} fontes
            </p>
          )}
        </div>
        <Link href="/pipeline" className="text-sm text-emerald-400 hover:underline">
          Pipeline →
        </Link>
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
              <div className="flex flex-wrap gap-2">
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
                <Link
                  href={`/sabatina/${o._id}`}
                  className="ml-auto rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20"
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
