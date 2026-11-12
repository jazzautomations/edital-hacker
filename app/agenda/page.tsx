"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { calcCachet } from "@/lib/cachet";
import { ruleFor } from "@/lib/docRules";
import { useAuthEmail } from "@/lib/useAuth";
import { SignIn } from "@/components/SignIn";

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
  const { email, setEmail, locked, authEnabled, ready } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile | null | undefined;
  const gigs = useQuery(
    api.gigs.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as Gig[] | undefined;
  const leads = useQuery(
    api.leads.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as { _id: string; name: string; status: string; updatedAt: number }[] | undefined;
  const expiring = useQuery(
    api.documents.expiringDocs,
    profile ? { profileId: profile._id as any, withinDays: 30 } : "skip"
  ) as { _id: string; name: string; expiresAt?: string }[] | undefined;

  const add = useMutation(api.gigs.add);
  const setStatus = useMutation(api.gigs.setStatus);
  const remove = useMutation(api.gigs.remove);

  const [form, setForm] = useState({ title: "", venue: "", date: "", fee: "" });
  const [calc, setCalc] = useState({ musicians: "3", pay: "400", km: "100", tech: "0", lodge: "0", extra: "0" });
  const [showCalc, setShowCalc] = useState(false);
  const [roteiro, setRoteiro] = useState<{ gig: Gig; setlist: string; promotor: string; cnpj: string; busy: boolean } | null>(null);

  // O roteiro ECAD é o doc que impede a verba do show de ir pra outros autores.
  async function gerarRoteiro() {
    if (!roteiro || !profile) return;
    setRoteiro({ ...roteiro, busy: true });
    const faixas = roteiro.setlist
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 31)
      .map((l) => {
        const [obra, ...rest] = l.split(/[-–—]/);
        return { obra: obra.trim(), autores: rest.join("-").trim() || profile.name };
      });
    const res = await fetch("/api/roteiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento: {
          artista: profile.name,
          evento: roteiro.gig.title,
          local: [roteiro.gig.venue].filter(Boolean).join(" · ") || "—",
          data: roteiro.gig.date,
          promotor: roteiro.promotor || undefined,
          cnpjPromotor: roteiro.cnpj || undefined,
        },
        faixas,
      }),
    });
    setRoteiro(null);
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roteiro-ecad-${roteiro.gig.date}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const cachet = calcCachet({
    musicians: Number(calc.musicians) || 1,
    payPerMusician: Number(calc.pay) || 0,
    transportKm: Number(calc.km) || 0,
    techCost: Number(calc.tech) || 0,
    lodging: Number(calc.lodge) || 0,
    extraCosts: Number(calc.extra) || 0,
  });

  if (!profile) {
    return (
      <SignIn
        title="Agenda e cachês"
        blurb="Shows, aulas e trabalhos com data, valor e o que já caiu na conta."
        email={email}
        setEmail={setEmail}
        locked={locked}
        authEnabled={authEnabled}
        ready={ready}
        profile={profile}
      />
    );
  }

  const sorted = [...(gigs ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const aReceber = sorted.filter((g) => g.status !== "pago" && g.status !== "cancelado" && g.fee)
    .reduce((s, g) => s + (g.fee ?? 0), 0);
  const recebido = sorted.filter((g) => g.status === "pago").reduce((s, g) => s + (g.fee ?? 0), 0);

  // Check-in do coach: a semana em números — o ritual que mentoria cobra caro.
  const today = new Date().toISOString().slice(0, 10);
  const in7d = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const weekGigs = sorted.filter((g) => g.date >= today && g.date <= in7d && g.status !== "cancelado");
  const overdue = sorted.filter((g) => g.date < today && g.status !== "pago" && g.status !== "cancelado" && g.fee);
  const staleLeads = (leads ?? []).filter(
    (l) => ["novo", "contatado", "respondeu"].includes(l.status) && l.updatedAt < Date.now() - 5 * 86400000
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl sm:text-5xl text-neutral-50">Agenda & cachês</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Shows, aulas e trabalhos — o coach controla data, valor e o que já pingou.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <a href={`/epk?email=${encodeURIComponent(profile.email)}`} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">EPK ↗</a>
          <Link href="/prospeccao" className="text-emerald-400 hover:underline">Prospecção →</Link>
          <Link href="/pipeline" className="text-emerald-400 hover:underline">Pipeline →</Link>
        </div>
      </header>

      {(weekGigs.length > 0 || overdue.length > 0 || staleLeads.length > 0 || (expiring?.length ?? 0) > 0) && (
        <section className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-emerald-400">
            ⚡ O coach olhou tua semana
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-neutral-300">
            {weekGigs.map((g) => (
              <li key={g._id}>🎤 <b>{g.date}</b> — {g.title}{g.venue ? ` · ${g.venue}` : ""}{g.fee ? ` · R$ ${g.fee.toLocaleString("pt-BR")}` : ""}</li>
            ))}
            {overdue.map((g) => (
              <li key={g._id} className="text-amber-400">💸 {g.title} foi dia {g.date} e R$ {g.fee?.toLocaleString("pt-BR")} ainda não tá como pago — cobra.</li>
            ))}
            {(expiring ?? []).map((d) => {
              const rule = ruleFor(`${d.name} ${(d as any).kind ?? ""}`);
              return (
                <li key={d._id} className="text-red-400">
                  📄 {d.name} vence {d.expiresAt?.slice(0, 10)}
                  {rule && <span className="text-neutral-400"> — {rule.hint}</span>}
                  {rule?.emitUrl && (
                    <> <a href={rule.emitUrl} target="_blank" rel="noreferrer" className="text-emerald-400 underline">emitir →</a></>
                  )}
                </li>
              );
            })}
            {staleLeads.slice(0, 3).map((l) => (
              <li key={l._id}>📞 {l.name} ({l.status}) parado há {Math.floor((Date.now() - l.updatedAt) / 86400000)}d — follow-up.</li>
            ))}
          </ul>
        </section>
      )}

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

      <section className="mb-4 rounded-2xl border border-neutral-800 p-5">
        <button
          onClick={() => setShowCalc(!showCalc)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="text-sm font-semibold text-emerald-400">
            💰 Não chute seu cachê — calcula o piso
          </span>
          <span className="font-mono text-xs text-neutral-500">{showCalc ? "−" : "+"}</span>
        </button>
        {showCalc && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
              {[
                ["músicos", "musicians"], ["R$/músico", "pay"], ["km total", "km"],
                ["som/técnico", "tech"], ["hospedagem", "lodge"], ["extras", "extra"],
              ].map(([label, key]) => (
                <label key={key} className="flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase text-neutral-500">{label}</span>
                  <input
                    className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
                    inputMode="numeric"
                    value={calc[key as keyof typeof calc]}
                    onChange={(e) => setCalc({ ...calc, [key]: e.target.value.replace(/[^\d.]/g, "") })}
                  />
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase text-neutral-500">piso (custa isso)</p>
                <p className="text-xl font-bold text-red-400">R$ {cachet.floor.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-neutral-500">pede isso</p>
                <p className="text-xl font-bold text-emerald-400">R$ {cachet.suggested.toLocaleString("pt-BR")}</p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase text-neutral-500">teto da faixa</p>
                <p className="text-xl font-bold text-neutral-300">R$ {cachet.ceiling.toLocaleString("pt-BR")}</p>
              </div>
              <p className="text-xs text-neutral-500">
                ≈ R$ {cachet.perMusician.toLocaleString("pt-BR")} por músico · abaixo do piso você paga pra tocar
              </p>
              <button
                onClick={() => setForm({ ...form, fee: String(cachet.suggested) })}
                className="ml-auto rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-black"
              >
                usar R$ {cachet.suggested.toLocaleString("pt-BR")} ↓
              </button>
            </div>
          </div>
        )}
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
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(g.title)}&dates=${g.date.replaceAll("-", "")}/${g.date.replaceAll("-", "")}${g.venue ? `&location=${encodeURIComponent(g.venue)}` : ""}&details=${encodeURIComponent(`Marcado via Manager${g.fee ? ` · cachê R$ ${g.fee.toLocaleString("pt-BR")}` : ""}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-sky-400 hover:bg-neutral-700"
                  title="Adicionar ao Google Calendar"
                >
                  📅 cal
                </a>
                <button
                  onClick={() => setRoteiro({ gig: g, setlist: "", promotor: "", cnpj: "", busy: false })}
                  className="rounded-lg bg-neutral-800 px-3 py-1.5 text-xs text-emerald-400 hover:bg-neutral-700"
                  title="Gerar roteiro musical ECAD (.xlsx) — sem ele a verba do show vai pro rateio e paga outros autores"
                >
                  📄 ecad
                </button>
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

      {roteiro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-700 bg-neutral-950 p-5">
            <h3 className="font-bold">📄 Roteiro musical ECAD</h3>
            <p className="mt-1 text-xs text-neutral-400">
              {roteiro.gig.title} · {roteiro.gig.date} — sem roteiro, a verba do show (que o promotor já paga) vai pro rateio e paga outros autores.
            </p>
            <input
              className="mt-3 w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm"
              placeholder="promotor (quem licencia junto ao ECAD)"
              value={roteiro.promotor}
              onChange={(e) => setRoteiro({ ...roteiro, promotor: e.target.value })}
            />
            <input
              className="mt-2 w-full rounded-xl bg-neutral-900 px-4 py-2 text-sm"
              placeholder="CNPJ/CPF do promotor (opcional)"
              value={roteiro.cnpj}
              onChange={(e) => setRoteiro({ ...roteiro, cnpj: e.target.value })}
            />
            <textarea
              className="mt-2 h-40 w-full rounded-xl bg-neutral-900 px-4 py-3 font-mono text-sm"
              placeholder={"Setlist — uma música por linha:\nNome da música — Autores\nEvidências — José Augusto / Paulo Valle"}
              value={roteiro.setlist}
              onChange={(e) => setRoteiro({ ...roteiro, setlist: e.target.value })}
            />
            <p className="mt-1 text-[10px] text-neutral-600">
              máx 31 músicas por formulário · prazo: até 48h úteis pós-show (licenças &lt; R$500)
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={gerarRoteiro}
                disabled={roteiro.busy || !roteiro.setlist.trim()}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black disabled:opacity-40"
              >
                {roteiro.busy ? "Gerando…" : "Baixar .xlsx"}
              </button>
              <button
                onClick={() => setRoteiro(null)}
                className="rounded-xl border border-neutral-700 px-4 py-3 text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
