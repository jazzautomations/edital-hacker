"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { personTypeMatches, type Opportunity, type Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";
import { AREA_OPTIONS, areasOf, fitOf, prazoConfiavel, tipo, valorConfiavel, viewOf } from "@/lib/opp";
import { Badge, Button, EmptyState, Input, LinkButton, Page, PageHeader, Select, Skeleton, brl, dataCurta, diasAte } from "@/components/ui";

const PAGE = 24;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Oportunidades() {
  const { email, ready } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as Profile | null | undefined;
  const opps = useQuery(api.opportunities.list, { limit: 400 }) as Opportunity[] | undefined;
  const pipeline = useQuery(api.pipeline.listForProfile, profile ? { profileId: profile._id as any } : "skip") as
    | { opportunityId: string }[]
    | undefined;
  const addToPipeline = useMutation(api.pipeline.add);

  const [q, setQ] = useState("");
  const [uf, setUf] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [soon, setSoon] = useState(false);
  const [withValue, setWithValue] = useState(false);
  const [myState, setMyState] = useState(false);
  const [area, setArea] = useState("");
  const [sort, setSort] = useState<"fit" | "prazo">("fit");
  const [shown, setShown] = useState(PAGE);
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());

  const rows = useMemo(
    () =>
      (opps ?? []).map((o) => {
        const v = viewOf(o);
        const bruto = diasAte(o.registrationTo);
        const dias = prazoConfiavel(bruto);
        return { o, v, dias, areas: areasOf(o, v), fit: fitOf(o, v, profile, bruto) };
      }),
    [opps, profile]
  );
  const byFit = Boolean(profile) && sort === "fit";
  const ufs = useMemo(() => Array.from(new Set(rows.map((r) => r.v.uf).filter(Boolean) as string[])).sort(), [rows]);
  const inPipeline = useMemo(() => new Set((pipeline ?? []).map((p) => p.opportunityId)), [pipeline]);

  const eligibility = (o: Opportunity): "ok" | "warn" | null => {
    if (!profile || o.proponentTypes.length === 0) return null;
    return personTypeMatches(profile.personType, o.proponentTypes) ? "ok" : "warn";
  };

  const filtered = useMemo(() => {
    const term = norm(q.trim());
    const out = rows.filter(({ o, v, dias, areas }) => {
      if (term && !norm(`${v.title} ${v.publisher} ${v.summary} ${o.categories.join(" ")}`).includes(term)) return false;
      if (uf && v.uf !== uf) return false;
      if (area && !areas.includes(area)) return false;
      if (myState && profile?.uf && v.uf !== null && v.uf !== profile.uf) return false;
      if (onlyMine && eligibility(o) === "warn") return false;
      if (soon && !(dias !== null && dias <= 7)) return false;
      if (withValue && !valorConfiavel(o)) return false;
      return true;
    });
    // "mais adequados": pontuação do perfil primeiro; empate decide pelo prazo
    // (a lista já chega do servidor em ordem de prazo, e o sort é estável)
    return byFit ? [...out].sort((a, b) => b.fit.score - a.fit.score) : out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, q, uf, area, myState, onlyMine, soon, withValue, profile, byFit]);

  const active = Boolean(q || uf || area || myState || onlyMine || soon || withValue);
  const clear = () => { setQ(""); setUf(""); setArea(""); setMyState(false); setOnlyMine(false); setSoon(false); setWithValue(false); setShown(PAGE); };
  const bons = profile ? rows.filter((r) => r.fit.score >= 40).length : 0;

  const chip = (on: boolean, set: (v: boolean) => void, label: string) => (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => { set(!on); setShown(PAGE); }}
      className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm ${
        on ? "border-emerald-400 bg-emerald-400 font-semibold text-neutral-950" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"
      }`}
    >
      {label}
    </button>
  );

  return (
    <Page width="max-w-4xl">
      <PageHeader
        title="Radar de editais"
        description={
          !opps
            ? "Editais, prêmios e chamadas com inscrição aberta."
            : profile
              ? `${opps.length} abertos agora. ${bons} combinam com teu perfil (${[profile.artAreas?.slice(0, 2).join(", ").toLowerCase(), profile.uf].filter(Boolean).join(" · ") || profile.personType.toLowerCase()}) e aparecem primeiro.`
              : `${opps.length} oportunidades com inscrição aberta agora. Cria teu perfil e o radar põe na frente o que combina com tua área e teu estado.`
        }
        actions={ready && !email ? <LinkButton href="/comecar?voltar=/oportunidades">Filtrar pro meu perfil</LinkButton> : undefined}
      />

      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-neutral-800/70 bg-neutral-950/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex gap-2">
          <Input
            type="search"
            value={q}
            onChange={(e) => { setQ(e.target.value); setShown(PAGE); }}
            placeholder="Buscar por palavra: música, audiovisual, Fortaleza…"
            aria-label="Buscar editais"
            className="flex-1"
          />
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.3fr]">
          <Select value={area} onChange={(e) => { setArea(e.target.value); setShown(PAGE); }} aria-label="Área">
            <option value="">Todas as áreas</option>
            {AREA_OPTIONS.map((a) => (
              <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
            ))}
          </Select>
          <Select value={uf} onChange={(e) => { setUf(e.target.value); setShown(PAGE); }} aria-label="Estado">
            <option value="">Todos os estados</option>
            {ufs.map((u) => (
              <option key={u}>{u}</option>
            ))}
          </Select>
          {profile && (
            <Select value={sort} onChange={(e) => { setSort(e.target.value as "fit" | "prazo"); setShown(PAGE); }} aria-label="Ordenar" className="col-span-2 sm:col-span-1">
              <option value="fit">Mais adequados pra mim</option>
              <option value="prazo">Prazo mais próximo</option>
            </Select>
          )}
        </div>
        <div className="no-scrollbar -mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1">
          {profile?.uf && chip(myState, setMyState, `Só ${profile.uf} e nacionais`)}
          {profile && chip(onlyMine, setOnlyMine, `Aceita ${tipo(profile.personType)}`)}
          {chip(soon, setSoon, "Fecha em 7 dias")}
          {chip(withValue, setWithValue, "Com valor informado")}
        </div>
      </div>

      {opps === undefined ? (
        <div className="flex flex-col gap-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : opps.length === 0 ? (
        <EmptyState icon="📭" title="O radar está sem editais abertos agora">
          As fontes são varridas todo dia. Volta amanhã ou fala com o coach pra ele procurar na tua cidade.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🔎" title="Nada com esses filtros" action={<Button variant="secondary" onClick={clear}>Limpar filtros</Button>}>
          Tenta uma palavra mais ampla ou tira um dos filtros.
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-sm text-neutral-500" aria-live="polite">
            {active ? `${filtered.length} de ${opps.length}` : `${opps.length} abertos`}, {byFit ? "os mais adequados ao teu perfil primeiro" : "do prazo mais próximo pro mais distante"}.
            {active && (
              <button onClick={clear} className="ml-2 text-emerald-300 underline underline-offset-2">
                Limpar filtros
              </button>
            )}
          </p>
          <ul className="flex flex-col gap-3">
            {filtered.slice(0, shown).map(({ o, v, dias, fit }) => {
              const added = inPipeline.has(o._id) || justAdded.has(o._id);
              return (
                <li key={o._id} className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 hover:border-neutral-700 sm:p-5">
                  <div className="flex flex-col-reverse items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <Link href={`/sabatina/${o._id}`} className="line-clamp-2 text-lg font-semibold leading-snug text-neutral-50 hover:text-emerald-300">
                        {v.title}
                      </Link>
                      <p className="mt-1 text-sm text-neutral-400">{v.publisher}</p>
                    </div>
                    {dias !== null ? (
                      <Badge tone={dias <= 3 ? "bad" : dias <= 10 ? "warn" : "neutral"} className="py-1">
                        {dias <= 0 ? "fecha hoje" : dias === 1 ? "fecha amanhã" : `${dias} dias`} · {dataCurta(o.registrationTo)}
                      </Badge>
                    ) : (
                      <Badge className="py-1">prazo no edital</Badge>
                    )}
                  </div>

                  {v.summary && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-neutral-400">{v.summary}</p>}

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {valorConfiavel(o) ? <Badge tone="good">até {brl(valorConfiavel(o)!)}</Badge> : null}
                    {fit.reasons.map((r) => (
                      <Badge key={r.text} tone={r.tone}>{r.text}</Badge>
                    ))}
                    {o.registrationLimitPerOwner != null && o.registrationLimitPerOwner > 0 && (
                      <Badge tone="warn">
                        máx. {o.registrationLimitPerOwner} {o.registrationLimitPerOwner > 1 ? "propostas" : "proposta"} por pessoa
                      </Badge>
                    )}
                    {v.isPublicPurchase && <Badge>contratação direta</Badge>}
                    {o.proponentTypes.slice(0, 3).map((t) => (
                      <Badge key={t}>{t}</Badge>
                    ))}
                    {o.categories.filter((c) => !/contrata|credenciamento/i.test(c)).slice(0, 3).map((c) => (
                      <span key={c} className="rounded-full bg-neutral-800/70 px-2.5 py-0.5 text-xs text-neutral-400">
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <LinkButton href={`/sabatina/${o._id}`} size="sm">
                      Testar na banca
                    </LinkButton>
                    {profile ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={added}
                        onClick={async () => {
                          await addToPipeline({ profileId: profile._id as any, opportunityId: o._id as any, stage: "interessado" });
                          setJustAdded((s) => new Set(s).add(o._id));
                        }}
                      >
                        {added ? "No teu pipeline" : "Guardar no pipeline"}
                      </Button>
                    ) : (
                      <LinkButton href={`/comecar?voltar=/oportunidades`} size="sm" variant="secondary">
                        Guardar no pipeline
                      </LinkButton>
                    )}
                    <a href={o.sourceUrl} target="_blank" rel="noreferrer" className="ml-auto text-sm text-neutral-400 underline underline-offset-2 hover:text-neutral-100">
                      Edital oficial
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
          {filtered.length > shown && (
            <div className="mt-6 flex justify-center">
              <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
                Mostrar mais {Math.min(PAGE, filtered.length - shown)} de {filtered.length - shown}
              </Button>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
