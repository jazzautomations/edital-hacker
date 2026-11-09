"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/types";

const NEXT: Record<string, string> = { marcado: "feito", feito: "pago" };
const STYLE: Record<string, string> = {
  marcado: "text-sky-400",
  feito: "text-amber-400",
  pago: "text-emerald-400",
  cancelado: "text-neutral-500",
};

type Gig = {
  _id: string;
  title: string;
  venue?: string;
  date: string;
  fee?: number;
  status: string;
};

export default function Agenda() {
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("manager_email") ?? "" : ""
  );
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile | null | undefined;
  const gigs = useQuery(
    api.gigs.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as Gig[] | undefined;

  const add = useMutation(api.gigs.add);
  const setStatus = useMutation(api.gigs.setStatus);
  const remove = useMutation(api.gigs.remove);

  const [form, setForm] = useState({ title: "", venue: "", date: "", fee: "" });

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Agenda & cachês</h1>
        <p className="text-sm text-neutral-400">Entre com seu email pra abrir tua agenda.</p>
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
          <button className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black">Entrar</button>
        </form>
      </main>
    );
  }

  const sorted = [...(gigs ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const aReceber = sorted.filter((g) => g.status !== "pago" && g.status !== "cancelado" && g.fee)
    .reduce((s, g) => s + (g.fee ?? 0), 0);
  const recebido = sorted.filter((g) => g.status === "pago").reduce((s, g) => s + (g.fee ?? 0), 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <Link href="/" className="font-mono text-xs text-emerald-400">manager_</Link>
          <h1 className="text-3xl font-bold">Agenda & cachês</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Shows, aulas e trabalhos — o coach controla data, valor e o que já pingou.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/prospeccao" className="text-emerald-400 hover:underline">Prospecção →</Link>
          <Link href="/pipeline" className="text-emerald-400 hover:underline">Pipeline →</Link>
        </div>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-800 p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">
            R$ {aReceber.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-neutral-500">a receber</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">
            R$ {recebido.toLocaleString("pt-BR")}
          </p>
          <p className="text-xs text-neutral-500">recebido</p>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-neutral-800 p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            placeholder="o que é (show, aula, gravação)"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            placeholder="local/contratante"
            value={form.venue}
            onChange={(e) => setForm({ ...form, venue: e.target.value })}
          />
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <input
            className="rounded-xl bg-neutral-900 px-4 py-3"
            placeholder="cachê R$"
            inputMode="numeric"
            value={form.fee}
            onChange={(e) => setForm({ ...form, fee: e.target.value.replace(/[^\d.,]/g, "") })}
          />
        </div>
        <button
          className="mt-3 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black disabled:opacity-40"
          disabled={!form.title || !form.date}
          onClick={async () => {
            await add({
              profileId: profile._id as any,
              title: form.title,
              venue: form.venue || undefined,
              date: form.date,
              fee: form.fee ? Number(form.fee.replace(",", ".")) : undefined,
            });
            setForm({ title: "", venue: "", date: "", fee: "" });
          }}
        >
          + marcar
        </button>
      </section>

      {sorted.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Agenda vazia. Marca um trampo ou fecha um lead na prospecção — ele vira gig aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((g) => (
            <article
              key={g._id}
              className={`flex items-center justify-between gap-4 rounded-2xl border border-neutral-800 p-4 ${g.status === "cancelado" ? "opacity-40" : ""}`}
            >
              <div>
                <h3 className="font-semibold">{g.title}</h3>
                <p className="font-mono text-xs text-neutral-500">
                  {g.date} {g.venue ? `· ${g.venue}` : ""}
                  {g.fee ? ` · R$ ${g.fee.toLocaleString("pt-BR")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xs uppercase ${STYLE[g.status]}`}>{g.status}</span>
                {NEXT[g.status] && (
                  <button
                    onClick={() => setStatus({ id: g._id as any, status: NEXT[g.status] })}
                    className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs hover:bg-neutral-700"
                  >
                    → {NEXT[g.status]}
                  </button>
                )}
                {g.status !== "cancelado" && g.status !== "pago" && (
                  <button
                    onClick={() => setStatus({ id: g._id as any, status: "cancelado" })}
                    className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-neutral-500"
                  >
                    ✕
                  </button>
                )}
                <button
                  onClick={() => remove({ id: g._id as any })}
                  className="rounded-lg px-2 py-1.5 text-xs text-neutral-600 hover:text-red-400"
                >
                  rm
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
