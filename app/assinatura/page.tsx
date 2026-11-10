"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import type { Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";

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
  const { email, setEmail, locked, authEnabled } = useAuthEmail();
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUALLY">("MONTHLY");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile | null | undefined;
  const subscribe = useAction(api.billing.subscribe);
  const unlock = useAction(api.billing.unlockEdital);
  const pixQr = useAction(api.billing.pixUnlock);
  const [pix, setPix] = useState<{
    brCode: string;
    brCodeBase64: string;
    amount: number;
  } | null>(null);

  async function goPixInline() {
    if (!profile || !unlockOpp) {
      setError("Entre com seu email primeiro (ou crie o perfil em /pipeline).");
      return;
    }
    setBusy("pix");
    setError(null);
    try {
      setPix(
        await pixQr({
          profileId: profile._id as any,
          opportunityId: unlockOpp as any,
        })
      );
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

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
        {authEnabled && !locked && (
          <a
            href="/login"
            className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Entrar com WorkOS →
          </a>
        )}
        <input
          className="w-64 rounded-xl bg-neutral-900 px-4 py-2 text-sm disabled:opacity-60"
          placeholder="seu@email.com"
          type="email"
          value={email}
          disabled={locked}
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
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={goPixInline}
              disabled={busy !== null}
              className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {busy === "pix" ? "Gerando QR…" : "Pix R$ 9,90 — QR na tela"}
            </button>
            <button
              onClick={() => go("unlock")}
              disabled={busy !== null}
              className="rounded-xl border border-neutral-700 px-6 py-3 text-sm disabled:opacity-50"
            >
              {busy === "unlock" ? "Abrindo Pix…" : "Abrir checkout"}
            </button>
          </div>

          {pix && (
            <div className="mt-5 flex flex-col items-center gap-3 rounded-xl bg-neutral-900 p-5">
              <img
                src={
                  pix.brCodeBase64.startsWith("data:")
                    ? pix.brCodeBase64
                    : `data:image/png;base64,${pix.brCodeBase64}`
                }
                alt="QR Code Pix"
                className="h-48 w-48 rounded-lg bg-white p-2"
              />
              <p className="text-sm font-semibold">
                R$ {(pix.amount / 100).toFixed(2).replace(".", ",")} — escaneia com o banco
              </p>
              <button
                onClick={() => navigator.clipboard.writeText(pix.brCode)}
                className="rounded-lg bg-neutral-800 px-4 py-2 text-xs text-sky-300"
              >
                Copiar código Pix (copia-e-cola)
              </button>
              <p className="text-[11px] text-neutral-500">
                Caiu o Pix? O webhook destrava o edital sozinho — pode voltar pro pipeline.
              </p>
            </div>
          )}
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
