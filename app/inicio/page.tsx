"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthEmail } from "@/lib/useAuth";
import type { Opportunity, Profile } from "@/lib/types";
import { tidyTitle } from "@/lib/format";
import { fitOf, prazoConfiavel, viewOf } from "@/lib/opp";
import { SignIn } from "@/components/SignIn";
import { Badge, Card, LinkButton, Notice, Page, SectionTitle, Skeleton, brl, dataCurta, diasAte } from "@/components/ui";

type Ctx = {
  pipeline: { _id: string; stage: string; sabatinaScore?: number; opportunity?: Opportunity | null }[];
  leads: { _id: string; name: string; status: string }[];
  gigs: { _id: string; title: string; venue?: string; date: string; fee?: number; status: string }[];
  docs: { _id: string; name: string; expiresAt?: string }[];
  riders: unknown[];
  sabatinas: { score: number }[];
};

function saudacao() {
  const h = new Date().getHours();
  return h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function Stat({ label, value, hint, href, tone }: { label: string; value: string; hint?: string; href: string; tone?: "warn" | "bad" }) {
  return (
    <Link href={href} className="group rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 hover:border-neutral-600">
      <p className="text-sm text-neutral-400">{label}</p>
      <p className={`mt-2 font-display text-4xl leading-none ${tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-neutral-50"}`}>
        {value}
      </p>
      {hint && <p className="mt-2 text-xs text-neutral-500 group-hover:text-neutral-400">{hint}</p>}
    </Link>
  );
}

export default function Inicio() {
  const { email, setEmail, locked, authEnabled, ready } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as Profile | null | undefined;
  const ctx = useQuery(api.riders.coachContext, profile ? { profileId: profile._id as any } : "skip") as Ctx | undefined;
  const opps = useQuery(api.opportunities.list, profile ? { limit: 60 } : "skip") as Opportunity[] | undefined;
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("bemvindo")) {
      setWelcome(true);
      url.searchParams.delete("bemvindo");
      window.history.replaceState(null, "", url.pathname);
    }
  }, []);

  if (!profile) {
    return (
      <SignIn
        title="Teu painel"
        email={email}
        setEmail={setEmail}
        locked={locked}
        authEnabled={authEnabled}
        ready={ready}
        profile={profile}
      />
    );
  }

  if (!ctx) {
    return (
      <Page>
        <Skeleton className="h-12 w-80 max-w-full" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="mt-8 h-64" />
      </Page>
    );
  }

  const first = profile.name.split(" ")[0];
  const today = new Date().toISOString().slice(0, 10);
  const openGigs = ctx.gigs.filter((g) => g.status !== "cancelado");
  const aReceber = openGigs.filter((g) => g.status !== "pago" && g.fee).reduce((s, g) => s + (g.fee ?? 0), 0);
  const atrasados = openGigs.filter((g) => g.date < today && g.status !== "pago" && g.fee);
  const proximos = openGigs.filter((g) => g.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);
  const ativos = ctx.pipeline.filter((i) => i.stage !== "arquivado");
  const leadsAtivos = ctx.leads.filter((l) => !["fechado", "descartado", "perdido"].includes(l.status));
  const docsVencendo = ctx.docs.filter((d) => {
    const n = diasAte(d.expiresAt);
    return n !== null && n <= 30;
  });
  const docsVencidos = docsVencendo.filter((d) => (diasAte(d.expiresAt) ?? 0) < 0);

  const prazos = ativos
    .filter((i) => i.opportunity?.registrationTo && ["descoberta", "interessado"].includes(i.stage))
    .map((i) => ({ item: i, dias: diasAte(i.opportunity!.registrationTo)! }))
    .filter((x) => x.dias !== null && x.dias >= 0)
    .sort((a, b) => a.dias - b.dias)
    .slice(0, 4);

  const inPipeline = new Set(ctx.pipeline.map((i) => i.opportunity?._id));
  // mesmas regras do radar: área, estado e tipo de inscrição do onboarding
  const sugestoes = (opps ?? [])
    .filter((o) => !inPipeline.has(o._id))
    .map((o) => {
      const v = viewOf(o);
      const bruto = diasAte(o.registrationTo);
      return { o, v, dias: prazoConfiavel(bruto), fit: fitOf(o, v, profile, bruto) };
    })
    .filter((r) => r.fit.score >= 40 && (r.dias === null || r.dias >= 2))
    .sort((a, b) => b.fit.score - a.fit.score)
    .slice(0, 4);

  const steps = [
    { done: true, title: "Montar teu perfil", href: "/comecar", cta: "" },
    { done: ctx.docs.length > 0, title: "Guardar teus documentos", hint: "Certidões e portfólio prontos pra anexar em qualquer edital.", href: "/documentos", cta: "Abrir documentos" },
    { done: ctx.pipeline.length > 0, title: "Escolher um edital no radar", hint: "Joga no pipeline o que faz sentido pra você.", href: "/oportunidades", cta: "Ver o radar" },
    { done: ctx.sabatinas.length > 0 || ctx.pipeline.some((i) => i.sabatinaScore != null), title: "Passar por uma sabatina", hint: "A banca simulada te diz a nota e o que falta antes de inscrever.", href: "/oportunidades", cta: "Sabatinar" },
    { done: ctx.leads.length > 0, title: "Caçar quem contrata na tua cidade", hint: "Casas, festivais e escolas com contato, em 2 minutos.", href: "/prospeccao", cta: "Caçar leads" },
    { done: ctx.gigs.length > 0, title: "Anotar teu próximo trabalho", hint: "Data e cachê na agenda, pra saber quanto entra no mês.", href: "/agenda", cta: "Abrir agenda" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <Page width="max-w-6xl">
      {welcome && (
        <div className="mb-6">
          <Notice tone="good">
            <b>Perfil criado.</b> O radar já está filtrando o que aceita {profile.personType.toLowerCase()} em {profile.uf ?? "todo o Brasil"}. Teus próximos passos estão logo abaixo.
          </Notice>
        </div>
      )}

      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-400">
            {profile.artAreas?.slice(0, 3).join(" · ")}
            {profile.city ? ` · ${profile.city}${profile.uf ? `/${profile.uf}` : ""}` : ""}
          </p>
          <h1 className="mt-2 text-4xl text-neutral-50 sm:text-6xl">
            {saudacao()}, {first}.
          </h1>
        </div>
        <LinkButton href="/coach" variant="secondary">
          Falar com o coach
        </LinkButton>
      </header>

      {(atrasados.length > 0 || docsVencidos.length > 0) && (
        <div className="mb-6 flex flex-col gap-2">
          {atrasados.length > 0 && (
            <Notice tone="bad">
              <b>{brl(atrasados.reduce((s, g) => s + (g.fee ?? 0), 0))} em cachê atrasado</b> ({atrasados.map((g) => g.title).join(", ")}).{" "}
              <Link href="/agenda" className="underline underline-offset-2">Ver na agenda</Link>
            </Notice>
          )}
          {docsVencidos.length > 0 && (
            <Notice tone="bad">
              <b>Documento vencido:</b> {docsVencidos.map((d) => d.name).join(", ")}.{" "}
              <Link href="/documentos" className="underline underline-offset-2">Atualizar</Link>
            </Notice>
          )}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Resumo">
        <Stat label="A receber" value={brl(aReceber)} hint={atrasados.length ? `${atrasados.length} em atraso` : `${openGigs.filter((g) => g.status !== "pago").length} trabalhos em aberto`} href="/agenda" tone={atrasados.length ? "bad" : undefined} />
        <Stat label="Editais no pipeline" value={String(ativos.length)} hint={prazos[0] ? `próximo prazo em ${prazos[0].dias} ${prazos[0].dias === 1 ? "dia" : "dias"}` : "nenhum prazo correndo"} href="/pipeline" />
        <Stat label="Leads em aberto" value={String(leadsAtivos.length)} hint="contratantes pra abordar" href="/prospeccao" />
        <Stat label="Documentos" value={String(ctx.docs.length)} hint={docsVencendo.length ? `${docsVencendo.length} vencendo em 30 dias` : "tudo em dia"} href="/documentos" tone={docsVencendo.length ? "warn" : undefined} />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
        <div className="flex min-w-0 flex-col gap-6">
          {doneCount < steps.length && (
            <Card as="section" className="border-emerald-500/30">
              <SectionTitle aside={<span className="text-sm font-semibold text-emerald-300">{doneCount} de {steps.length}</span>}>
                Primeiros passos
              </SectionTitle>
              <div className="mb-4 h-1.5 rounded-full bg-neutral-800" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Primeiros passos concluídos">
                <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
              </div>
              <ul className="flex flex-col">
                {steps.map((s) => {
                  const isNext = s === next;
                  return (
                    <li key={s.title} className={`flex items-center gap-3 rounded-xl px-2 py-2.5 ${isNext ? "bg-neutral-800/60" : ""}`}>
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                          s.done ? "border-emerald-400 bg-emerald-400 text-neutral-950" : "border-neutral-600 text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${s.done ? "text-neutral-500 line-through" : "font-medium text-neutral-100"}`}>{s.title}</p>
                        {isNext && s.hint && <p className="mt-0.5 text-xs leading-relaxed text-neutral-400">{s.hint}</p>}
                      </div>
                      {!s.done && s.cta && (
                        <LinkButton href={s.href} size="sm" variant={isNext ? "primary" : "ghost"}>
                          {s.cta}
                        </LinkButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

          <Card as="section">
            <SectionTitle aside={<Link href="/oportunidades" className="text-sm text-emerald-300 hover:underline">Ver radar</Link>}>
              {prazos.length ? "Prazos correndo" : "Combinam com teu perfil"}
            </SectionTitle>
            {prazos.length > 0 ? (
              <ul className="flex flex-col divide-y divide-neutral-800">
                {prazos.map(({ item, dias }) => (
                  <li key={item._id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/sabatina/${item.opportunity!._id}`} className="min-w-0 flex-1 hover:text-emerald-300">
                      <p className="truncate font-medium text-neutral-100">{tidyTitle(item.opportunity!.name)}</p>
                      <p className="text-xs text-neutral-500">{item.opportunity!.sourceName}</p>
                    </Link>
                    <Badge tone={dias <= 3 ? "bad" : dias <= 10 ? "warn" : "neutral"}>
                      {dias === 0 ? "fecha hoje" : dias === 1 ? "fecha amanhã" : `${dias} dias`}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : opps === undefined ? (
              <Skeleton className="h-32" />
            ) : sugestoes.length > 0 ? (
              <ul className="flex flex-col divide-y divide-neutral-800">
                {sugestoes.map(({ o, v, dias, fit }) => (
                  <li key={o._id} className="flex items-center justify-between gap-3 py-3">
                    <Link href={`/sabatina/${o._id}`} className="min-w-0 flex-1 hover:text-emerald-300">
                      <p className="truncate font-medium text-neutral-100">{v.title}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {fit.reasons.filter((r) => r.tone === "good").map((r) => r.text).join(" · ") || v.publisher}
                      </p>
                    </Link>
                    {dias !== null && <Badge tone={dias <= 3 ? "bad" : dias <= 10 ? "warn" : "neutral"}>{dias === 1 ? "fecha amanhã" : `${dias} dias`}</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-400">Nenhum edital aberto que aceite teu perfil agora. O radar roda todo dia.</p>
            )}
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card as="section">
            <SectionTitle aside={<Link href="/agenda" className="text-sm text-emerald-300 hover:underline">Agenda</Link>}>
              Próximos trabalhos
            </SectionTitle>
            {proximos.length > 0 ? (
              <ul className="flex flex-col divide-y divide-neutral-800">
                {proximos.map((g) => (
                  <li key={g._id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-100">{g.title}</p>
                      <p className="text-xs text-neutral-500">
                        {dataCurta(g.date)}
                        {g.venue ? ` · ${g.venue}` : ""}
                      </p>
                    </div>
                    {g.fee ? <span className="shrink-0 text-sm font-semibold text-neutral-100">{brl(g.fee)}</span> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm leading-relaxed text-neutral-400">
                  Nada marcado pra frente. Anota um show ou pede pro coach: “sexta toco no Bar do Zé por R$ 1.500”.
                </p>
                <LinkButton href="/agenda" size="sm" variant="secondary">Marcar trabalho</LinkButton>
              </div>
            )}
          </Card>

          <Card as="section">
            <SectionTitle>Atalhos</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Rider técnico", "/rider"],
                ["Press kit (EPK)", `/epk?email=${encodeURIComponent(profile.email)}`],
                ["Prestação de contas", "/prestacao"],
                ["Planos", "/assinatura"],
              ].map(([label, href]) => (
                <Link key={label} href={href} className="rounded-xl border border-neutral-800 px-3 py-3 text-sm text-neutral-200 hover:border-neutral-600 hover:bg-neutral-900">
                  {label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
