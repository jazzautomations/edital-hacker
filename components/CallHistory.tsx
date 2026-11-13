"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuthEmail } from "@/lib/useAuth";

type Call = { _id: string; mode: string; createdAt: number; opportunityName: string | null; turns: { role: string; text: string }[] };

/** Chamadas de voz gravadas: data, sobre o quê e a transcrição inteira. */
export function CallHistory() {
  const { token } = useAuthEmail();
  const calls = useQuery(api.voice.listCalls, token ? { token } : "skip") as Call[] | undefined;
  if (!calls?.length) return null;
  const fmt = (ms: number) => new Date(ms).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <details className="mb-4 rounded-2xl border border-neutral-800 px-4 py-3">
      <summary className="cursor-pointer text-sm font-semibold text-neutral-200">
        Chamadas gravadas ({calls.length})
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {calls.map((c) => {
          const first = c.turns.find((t) => t.role === "user")?.text ?? "";
          return (
            <li key={c._id}>
              <details className="rounded-xl bg-neutral-900/60 px-3 py-2">
                <summary className="cursor-pointer text-sm text-neutral-300">
                  <span className="font-mono text-xs text-neutral-500">{fmt(c.createdAt)}</span>{" "}
                  {c.mode === "sabatina" ? `Banca: ${c.opportunityName ?? "edital"}` : "Coach"}
                  <span className="text-neutral-500"> · {first.slice(0, 70)}{first.length > 70 ? "…" : ""}</span>
                </summary>
                <ol className="mt-2 flex flex-col gap-1.5 border-t border-neutral-800 pt-2 text-sm">
                  {c.turns.map((t, i) => (
                    <li key={i} className={t.role === "user" ? "text-neutral-100" : "text-neutral-400"}>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-500">{t.role === "user" ? "você" : c.mode === "sabatina" ? "banca" : "coach"}</span>{" "}
                      {t.text}
                    </li>
                  ))}
                </ol>
              </details>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
