"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { Profile } from "@/lib/types";

const PLANS = [
  {
    plan: "manager",
    name: "Manager",
    monthly: { price: "R$ 49", cycle: "MONTHLY", label: "/mês" },
    annual: { price: "R$ 490", cycle: "ANNUALLY", label: "/ano (2 meses grátis)" },
    features: ["Sabatina ilimitada", "Pipeline + documentos + contatos", "Alertas em tempo real"],
  },
  {
    plan: "manager_pro",
    name: "Manager Pro",
    monthly: { price: "R$ 99", cycle: "MONTHLY", label: "/mês" },
    annual: { price: "R$ 990", cycle: "ANNUALLY", label: "/ano (2 meses grátis)" },
    features: ["Tudo do Manager", "Prestação de contas (livro-caixa)", "Contrato de show + split Pix"],
  },
];

function Inner() {
  const params = useSearchParams();
  const unlockOpp = params.get("unlock"); // opportunityId p/ avulso
  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("manager_email") ?? "" : ""
  );
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUALLY">("MONTHLY");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile | null | undefined;
  const subscribe = useAction(api.billing.subscribe);
  const unlock = useAction(api.billing.unlockEdital);

  async function go(kind: "sub" | "unlock", plan?: string, cyc?: string) {
    if (!profile) {
      setError("Entre com seu email primeiro (ou crie o perfil em /pipeline).");
      return;
    }
    setBusy(kind + (plan ?? ""));
    setError(null);
    try {
      const base = window.location.origin;
      const r =
        kind === "sub"
          ? await subscribe({
              profileId: profile._id as any,
              plan: plan!,
              cycle: cyc!,
              returnUrl: `${base}/assinatura`,
              completionUrl: `${base}/pipeline?pago=1`,
            })
          : await unlock({
              profileId: profile._id as any,
              opportunityId: unlockOpp as any,
              returnUrl: `${base}/assinatura`,
              completionUrl: `${base}/sabatina/${unlockOpp}?pago=1`,
            });
      window.location.href = r.url;
    } catch (e) {
      setError(String(e));
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10">
      <Link href="/" className="font-mono text-xs text-emerald-400">manager_</Link>
      <h1 className="mt-2 text-3xl font-bold">Menos que a comissão de um show.</h1>
      <p className="mt-1 text-neutral-400">
        Um cachê de R$ 800 custa R$ 120–160 pro booker. Aqui custa R$ 49 — e não
        some com 20% de tudo que você ganha.
      </p>

      <div className="mt-6 flex items-center gap-3">
        <input
          className="w-64 rounded-xl bg-neutral-900 px-4 py-2 text-sm"
          placeholder="seu@email.com"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            localStorage.setItem("manager_email", e.target.value);
          }}
        />
        {profile && (
          <span className="text-sm text-emerald-400">
            plano atual: {profile.plan}
          </span>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {unlockOpp && (
        <div className="mt-8 rounded-2xl border border-emerald-700 bg-emerald-950/30 p-6">
          <p className="font-semibold">Destravar só este edital</p>
          <p className="mt-1 text-sm text-neutral-400">
            Sabatina completa deste edital por um Pix único — sem assinatura.
          </p>
          <button
            onClick={() => go("unlock")}
            disabled={busy !== null}
            className="mt-4 rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black disabled:opacity-50"
          >
            {busy === "unlock" ? "Abrindo Pix…" : "Pagar R$ 9,90 via Pix"}
          </button>
        </div>
      )}

      <div className="mt-6 flex gap-2">
        {(["MONTHLY", "ANNUALLY"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              cycle === c ? "bg-emerald-500 text-black" : "bg-neutral-800"
            }`}
          >
            {c === "MONTHLY" ? "Mensal" : "Anual −17%"}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => {
          const opt = cycle === "MONTHLY" ? p.monthly : p.annual;
          return (
            <div key={p.plan} className="rounded-2xl border border-neutral-800 p-6">
              <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">
                {p.name}
              </p>
              <p className="mt-2 text-3xl font-bold">
                {opt.price}
                <span className="text-base font-normal text-neutral-400"> {opt.label}</span>
              </p>
              <ul className="mt-4 flex flex-col gap-1 text-sm text-neutral-300">
                {p.features.map((f) => (
                  <li key={f}>· {f}</li>
                ))}
              </ul>
              <button
                onClick={() => go("sub", p.plan, cycle)}
                disabled={busy !== null}
                className="mt-6 w-full rounded-xl bg-emerald-500 py-3 font-semibold text-black disabled:opacity-50"
              >
                {busy === `sub${p.plan}` ? "Abrindo checkout…" : `Assinar ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-neutral-500">
        Pagamento via AbacatePay — Pix ou cartão. Modo sandbox durante o hackathon.
      </p>
    </main>
  );
}

export default function Assinatura() {
  return (
    <Suspense fallback={<main className="p-10">…</main>}>
      <Inner />
    </Suspense>
  );
}
