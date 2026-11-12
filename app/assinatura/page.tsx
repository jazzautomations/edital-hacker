"use client";

import { useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import type { Opportunity, Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";
import { tidyTitle } from "@/lib/format";
import { Badge, Button, Card, Field, Input, LinkButton, Notice, Page, PageHeader } from "@/components/ui";

// Preços = os dos produtos cadastrados na AbacatePay (o que é cobrado de fato).
const PLANS = [
  {
    plan: "manager",
    name: "Manager",
    pitch: "Pra quem vive de edital e show e quer parar de perder prazo.",
    monthly: { price: "R$ 49,90", cycle: "MONTHLY", label: "por mês" },
    annual: { price: "R$ 479", cycle: "ANNUALLY", label: "por ano · sai R$ 39,90/mês" },
    features: ["Sabatina de banca ilimitada", "Pipeline, documentos e contatos", "Aviso de prazo e de certidão vencendo", "Coach por texto e por voz"],
  },
  {
    plan: "manager_pro",
    name: "Manager Pro",
    pitch: "Pra quem executa projeto aprovado e precisa prestar contas.",
    monthly: { price: "R$ 99,90", cycle: "MONTHLY", label: "por mês" },
    annual: { price: "R$ 959", cycle: "ANNUALLY", label: "por ano · sai R$ 79,90/mês" },
    features: ["Tudo do Manager", "Prestação de contas no formato do edital", "Contrato de show e revisão de contrato", "Roteiro ECAD e rider técnico em PDF"],
    featured: true,
  },
];

const fmtCpf = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/, ".$1-$2");
};

type Pix = { pixId: string; brCode: string; brCodeBase64: string; amount: number; sandbox: boolean };

function Inner() {
  const params = useSearchParams();
  const unlockOpp = params.get("unlock");
  const { email, ready } = useAuthEmail();
  const [cycle, setCycle] = useState<"MONTHLY" | "ANNUALLY">("ANNUALLY");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cpf, setCpf] = useState("");
  const [pix, setPix] = useState<Pix | null>(null);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as Profile | null | undefined;
  const opp = useQuery(api.opportunities.get, unlockOpp ? { id: unlockOpp as any } : "skip") as Opportunity | null | undefined;
  const plan = useQuery(api.billing.planStatus, profile ? { profileId: profile._id as any } : "skip") as
    | { plan: string; unlockedOpportunityIds: string[] }
    | undefined;
  const subscribe = useAction(api.billing.subscribe);
  const pixQr = useAction(api.billing.pixUnlock);
  const pixStatus = useAction(api.billing.pixStatus);
  const pixSimulate = useAction(api.billing.pixSimulate);
  const polling = useRef(false);

  const alreadyUnlocked = Boolean(unlockOpp && plan?.unlockedOpportunityIds?.includes(unlockOpp));
  const here = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/assinatura";
  const loginHref = `/comecar?voltar=${encodeURIComponent(here)}`;

  // Enquanto o QR está na tela, confere o pagamento a cada 4s e destrava sozinho.
  useEffect(() => {
    if (!pix || paid) return;
    const t = setInterval(async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        const r = await pixStatus({ pixId: pix.pixId });
        if (r.status === "PAID") setPaid(true);
        else if (r.status === "EXPIRED" || r.status === "CANCELLED") {
          setPix(null);
          setError("Esse QR expirou. Gera outro pra pagar.");
        }
      } catch {
        /* rede oscilou: tenta de novo no próximo ciclo */
      } finally {
        polling.current = false;
      }
    }, 4000);
    return () => clearInterval(t);
  }, [pix, paid, pixStatus]);

  async function gerarPix() {
    if (!profile || !unlockOpp) return;
    if (cpf.replace(/\D/g, "").length !== 11) {
      setError("Digita o CPF completo de quem vai pagar (11 números).");
      return;
    }
    setBusy("pix");
    setError(null);
    try {
      setPix((await pixQr({ profileId: profile._id as any, opportunityId: unlockOpp as any, taxId: cpf })) as Pix);
    } catch (e) {
      setError(/CPF inválido/.test(String(e)) ? "Esse CPF não confere. Olha os números e tenta de novo." : "Não deu pra gerar o Pix agora. Tenta de novo em instantes.");
    } finally {
      setBusy(null);
    }
  }

  async function assinar(planId: string) {
    if (!profile) return;
    setBusy(`sub${planId}`);
    setError(null);
    try {
      const base = window.location.origin;
      const r = await subscribe({
        profileId: profile._id as any,
        plan: planId,
        cycle,
        returnUrl: `${base}/assinatura`,
        completionUrl: `${base}/inicio?assinou=1`,
      });
      window.location.href = r.url;
    } catch {
      setError("Não deu pra abrir o checkout agora. Tenta de novo em instantes.");
      setBusy(null);
    }
  }

  return (
    <Page width="max-w-4xl">
      <PageHeader
        title="Menos que a comissão de um show."
        description="Um booker fica com 15 a 20% de cada cachê. O Manager custa um valor fixo e não tira nada do que você ganha."
        actions={profile && plan ? <Badge tone={plan.plan === "free" ? "neutral" : "good"}>Plano atual: {plan.plan === "free" ? "grátis" : plan.plan === "manager_pro" ? "Manager Pro" : "Manager"}</Badge> : undefined}
      />

      {ready && !profile && profile !== undefined || (ready && !email) ? (
        <div className="mb-8">
          <Notice tone="info">
            Pra pagar a gente precisa saber de quem é a conta.{" "}
            <a href={loginHref} className="font-semibold underline underline-offset-2">Entrar ou criar perfil</a> leva 1 minuto.
          </Notice>
        </div>
      ) : null}

      {error && <div className="mb-6"><Notice tone="bad">{error}</Notice></div>}

      {unlockOpp && (
        <Card as="section" className="mb-10 border-emerald-500/40">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">Só este edital</p>
          <h2 className="mt-2 text-xl font-semibold text-neutral-50">
            {opp ? tidyTitle(opp.name) : "Destravar a sabatina deste edital"}
          </h2>

          {paid || alreadyUnlocked ? (
            <div className="mt-5 flex flex-col items-start gap-4">
              <Notice tone="good">
                <b>Pagamento confirmado.</b> A sabatina deste edital está liberada pra você, sem limite de tentativas.
              </Notice>
              <LinkButton href={`/sabatina/${unlockOpp}`} size="lg">Ir pra sabatina</LinkButton>
            </div>
          ) : pix ? (
            <div className="mt-5 grid items-center gap-6 sm:grid-cols-[auto_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pix.brCodeBase64.startsWith("data:") ? pix.brCodeBase64 : `data:image/png;base64,${pix.brCodeBase64}`}
                alt="QR Code do Pix"
                width={208}
                height={208}
                className="mx-auto h-52 w-52 rounded-2xl bg-white p-3"
              />
              <div className="flex flex-col gap-3">
                <p className="font-display text-5xl text-neutral-50">R$ {(pix.amount / 100).toFixed(2).replace(".", ",")}</p>
                <ol className="list-decimal space-y-1 pl-5 text-sm leading-relaxed text-neutral-300">
                  <li>Abre o app do teu banco e escolhe pagar com Pix.</li>
                  <li>Aponta a câmera pro QR ou cola o código abaixo.</li>
                  <li>Deixa esta tela aberta: ela libera sozinha quando o Pix cair.</li>
                </ol>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(pix.brCode).catch(() => {});
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    }}
                  >
                    {copied ? "Código copiado" : "Copiar código Pix"}
                  </Button>
                  {pix.sandbox && (
                    <Button
                      variant="ghost"
                      loading={busy === "sim"}
                      onClick={async () => {
                        setBusy("sim");
                        try {
                          await pixSimulate({ pixId: pix.pixId });
                        } catch {
                          setError("A simulação falhou. Tenta de novo.");
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      Simular pagamento (ambiente de teste)
                    </Button>
                  )}
                </div>
                <p className="flex items-center gap-2 text-sm text-neutral-400" aria-live="polite">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Aguardando o pagamento
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                Sabatina completa deste edital por um Pix único de R$ 9,90. Sem assinatura, sem renovação.
              </p>
              <form
                className="mt-5 flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void gerarPix();
                }}
              >
                <Field label="CPF de quem paga" hint="O banco exige pra gerar o Pix. Não guardamos." className="w-full sm:w-64">
                  <Input inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(fmtCpf(e.target.value))} />
                </Field>
                <Button type="submit" size="lg" loading={busy === "pix"} disabled={!profile} className="mb-[1.375rem]">
                  Gerar Pix de R$ 9,90
                </Button>
              </form>
            </>
          )}
        </Card>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-neutral-50">{unlockOpp ? "Ou assina e sabatina todos" : "Escolhe teu plano"}</h2>
        <div role="group" aria-label="Ciclo de cobrança" className="flex rounded-full border border-neutral-800 p-1">
          {(["ANNUALLY", "MONTHLY"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              aria-pressed={cycle === c}
              className={`rounded-full px-4 py-1.5 text-sm ${cycle === c ? "bg-neutral-100 font-semibold text-neutral-950" : "text-neutral-400 hover:text-neutral-100"}`}
            >
              {c === "MONTHLY" ? "Mensal" : "Anual · 20% off"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => {
          const opt = cycle === "MONTHLY" ? p.monthly : p.annual;
          const current = plan?.plan === p.plan;
          return (
            <div key={p.plan} className={`flex flex-col rounded-3xl border p-6 sm:p-7 ${p.featured ? "border-emerald-500/50 bg-emerald-500/5" : "border-neutral-800 bg-neutral-900/50"}`}>
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-neutral-50">{p.name}</p>
                {p.featured && <Badge tone="good">mais completo</Badge>}
              </div>
              <p className="mt-1 text-sm text-neutral-400">{p.pitch}</p>
              <p className="mt-5 font-display text-5xl text-neutral-50">{opt.price}</p>
              <p className="mt-1 text-sm text-neutral-400">{opt.label}</p>
              <ul className="mt-6 flex flex-1 flex-col gap-2.5 text-sm text-neutral-200">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <span aria-hidden className="mt-0.5 text-emerald-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              {profile ? (
                <Button className="mt-7 w-full" size="lg" variant={p.featured ? "primary" : "secondary"} loading={busy === `sub${p.plan}`} disabled={current || busy !== null} onClick={() => assinar(p.plan)}>
                  {current ? "Teu plano atual" : `Assinar ${p.name}`}
                </Button>
              ) : (
                <LinkButton href={loginHref} className="mt-7 w-full" size="lg" variant={p.featured ? "primary" : "secondary"}>
                  Criar perfil pra assinar
                </LinkButton>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-5 text-sm leading-relaxed text-neutral-500">
        Radar de editais e a primeira sabatina são grátis pra sempre. Pagamento por Pix ou cartão via AbacatePay. Cancela quando quiser.
      </p>
    </Page>
  );
}

export default function Assinatura() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
