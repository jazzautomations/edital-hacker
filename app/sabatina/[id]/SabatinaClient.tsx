"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { personTypeMatches, type Opportunity, type Profile } from "@/lib/types";
import type { SabatinaContext, ChatTurn } from "@/lib/llm";
import { RichText } from "@/lib/format";
import { prazoConfiavel, valorConfiavel, viewOf } from "@/lib/opp";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import VoiceSabatina from "@/components/VoiceSabatina";
import { Badge, Button, Card, Field, Input, LinkButton, Notice, Page, Select, Skeleton, Textarea, brl, dataCurta, diasAte } from "@/components/ui";

interface Msg {
  role: "user" | "model";
  text: string;
}

interface Verdict {
  score: number;
  summary: string;
  gaps: string[];
  missingDocs: string[];
  warnings: string[];
  injectionDetected: boolean;
  documentalGate?: "pass" | "fail";
  criterionScores?: { criterion: string; score: number; note?: string }[];
}

const FREE_LIMIT = 1;

export default function Sabatina({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const oppId = id as Id<"opportunities">;
  const opp = useQuery(api.opportunities.get, { id: oppId }) as Opportunity | null | undefined;

  const { email, ready } = useAuthEmail();
  const profile = useMyProfile();
  const planStatus = useQuery(api.billing.planStatus, profile ? { profileId: profile._id as any } : "skip") as
    | { plan: string; unlockedOpportunityIds: string[]; sabatinaCount: number }
    | undefined;
  const saveSession = useMutation(api.sabatina.save);
  const addToPipeline = useMutation(api.pipeline.add);
  const setResult = useMutation(api.pipeline.setSabatinaResult);

  // visitante sem perfil pode testar: preenche o mínimo aqui mesmo
  const [guest, setGuest] = useState({ name: "", personType: "Pessoa Física", artAreas: "", uf: "" });
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<{ text?: string } | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [added, setAdded] = useState(false);
  const historyRef = useRef<ChatTurn[]>([]);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // chaves obrigatórias: scrollIntoView devolve Promise em navegador novo
    if (started) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, verdict, started]);

  const who = profile
    ? { name: profile.name, personType: profile.personType, artAreas: profile.artAreas ?? [], uf: profile.uf, bio: profile.bio }
    : {
        name: guest.name.trim() || "Artista",
        personType: guest.personType,
        artAreas: guest.artAreas.split(",").map((s) => s.trim()).filter(Boolean),
        uf: guest.uf || undefined,
        bio: undefined as string | undefined,
      };

  const paywalled =
    profile &&
    planStatus &&
    planStatus.plan === "free" &&
    planStatus.sabatinaCount >= FREE_LIMIT &&
    !planStatus.unlockedOpportunityIds.includes(oppId as string);

  async function sendTurn(userText?: string) {
    if (!opp) return;
    setLoading(true);
    setFailed(null);
    const context: SabatinaContext = {
      opportunity: {
        name: opp.name,
        sourceName: opp.sourceName,
        registrationTo: opp.registrationTo,
        proponentTypes: opp.proponentTypes,
        categories: opp.categories,
        totalResource: opp.totalResource,
        enriched: opp.enriched ?? null,
      },
      profile: who,
    };
    const history = [...historyRef.current];
    if (userText) {
      history.push({ role: "user", text: userText });
      setMessages((m) => [...m, { role: "user", text: userText }]);
    }
    try {
      const res = await fetch("/api/sabatina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, history }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || (!data.reply && !data.verdict)) throw new Error(data.error ?? "sem resposta");
      historyRef.current = [...history, { role: "model", text: data.reply ?? "" }];
      if (data.reply) setMessages((m) => [...m, { role: "model", text: data.reply }]);
      if (data.verdict) {
        setVerdict(data.verdict);
        if (profile) {
          await saveSession({
            profileId: profile._id as any,
            opportunityId: oppId,
            turns: historyRef.current,
            verdict: data.verdict,
          }).catch(() => {});
        }
      }
    } catch {
      // a pergunta do usuário já está na tela; guarda pra reenviar sem redigitar
      if (userText) setMessages((m) => m.slice(0, -1));
      setFailed({ text: userText });
      if (userText) setInput(userText);
    } finally {
      setLoading(false);
    }
  }

  async function trackIt() {
    if (!profile || !verdict) return;
    const itemId = await addToPipeline({ profileId: profile._id as any, opportunityId: oppId, stage: "interessado" });
    await setResult({ id: itemId as any, sabatinaScore: verdict.score, sabatinaSummary: verdict.summary });
    setAdded(true);
  }

  function restart() {
    historyRef.current = [];
    setMessages([]);
    setVerdict(null);
    setAdded(false);
    setFailed(null);
    void sendTurn();
  }

  if (opp === undefined) {
    return (
      <Page width="max-w-3xl">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-5 h-24" />
        <Skeleton className="mt-6 h-72" />
      </Page>
    );
  }
  if (opp === null) {
    return (
      <Page width="max-w-3xl">
        <h1 className="text-4xl text-neutral-50">Esse edital saiu do radar</h1>
        <p className="mt-3 text-neutral-400">O prazo pode ter encerrado ou a fonte tirou a página do ar.</p>
        <LinkButton href="/oportunidades" className="mt-6">Ver editais abertos</LinkButton>
      </Page>
    );
  }

  const v = viewOf(opp);
  const dias = prazoConfiavel(diasAte(opp.registrationTo));
  const e = opp.enriched;
  const ineligible = opp.proponentTypes.length > 0 && !personTypeMatches(who.personType, opp.proponentTypes);
  const here = `/sabatina/${id}`;

  // ───────── antes de começar: briefing do edital ─────────
  if (!started) {
    return (
      <Page width="max-w-3xl">
        <Link href="/oportunidades" className="text-sm text-neutral-400 hover:text-neutral-100">
          ← Radar de editais
        </Link>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {dias !== null && (
            <Badge tone={dias <= 3 ? "bad" : dias <= 10 ? "warn" : "neutral"}>
              {dias <= 0 ? "fecha hoje" : dias === 1 ? "fecha amanhã" : `fecha em ${dias} dias`} · {dataCurta(opp.registrationTo, true)}
            </Badge>
          )}
          {valorConfiavel(opp) ? <Badge tone="good">até {brl(valorConfiavel(opp)!)}</Badge> : null}
          {opp.proponentTypes.slice(0, 3).map((t) => <Badge key={t}>{t}</Badge>)}
        </div>
        <h1 className="mt-4 text-3xl text-neutral-50 sm:text-4xl">{v.title}</h1>
        <p className="mt-2 text-neutral-400">{v.publisher}</p>
        <a href={opp.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-emerald-300 underline underline-offset-2">
          Abrir o edital oficial
        </a>

        {e ? (
          <div className="mt-8 flex flex-col gap-4">
            {e.summary && <p className="text-base leading-relaxed text-neutral-200">{e.summary}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              {e.eligibility && (
                <Card>
                  <h2 className="text-sm font-semibold text-neutral-100">Quem pode se inscrever</h2>
                  <p className="mt-2 text-sm leading-relaxed text-neutral-400">{e.eligibility}</p>
                </Card>
              )}
              {e.rubric?.length > 0 && (
                <Card>
                  <h2 className="text-sm font-semibold text-neutral-100">O que a banca pontua</h2>
                  <ul className="mt-2 flex flex-col gap-1.5 text-sm text-neutral-400">
                    {e.rubric.map((r) => (
                      <li key={r.criterion} className="flex justify-between gap-3">
                        <span>{r.criterion}</span>
                        {r.weight && <span className="shrink-0 font-mono text-xs text-neutral-500">{r.weight}</span>}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {e.requiredDocs.length > 0 && (
                <Card>
                  <h2 className="text-sm font-semibold text-neutral-100">Documentos exigidos</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-neutral-400">
                    {e.requiredDocs.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                  <Link href="/documentos" className="mt-3 inline-block text-sm text-emerald-300 underline underline-offset-2">
                    Conferir os meus
                  </Link>
                </Card>
              )}
              {e.disqualifiers.length > 0 && (
                <Card className="border-red-500/30">
                  <h2 className="text-sm font-semibold text-red-200">O que desclassifica</h2>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-neutral-400">
                    {e.disqualifiers.map((d) => <li key={d}>{d}</li>)}
                  </ul>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {v.summary && <p className="text-base leading-relaxed text-neutral-300">{v.summary}</p>}
            <Notice tone="warn">
              Ainda não li o regulamento completo deste edital. A banca vai te sabatinar com o que está publicado no resumo, sem a tabela de critérios.
            </Notice>
          </div>
        )}

        <Card as="section" className="mt-8 border-emerald-500/40">
          <h2 className="text-xl font-semibold text-neutral-50">Sabatina de banca</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
            Um parecerista simulado te entrevista sobre a proposta, do jeito que a banca real faria, e devolve uma nota de 0 a 100 com o que falta. Leva uns 5 minutos.
          </p>

          {paywalled ? (
            <div className="mt-5 flex flex-col items-start gap-3">
              <Notice tone="info">Tua sabatina grátis já foi usada. Destrava só este edital por R$ 9,90 no Pix, ou assina e sabatina todos.</Notice>
              <LinkButton href={`/assinatura?unlock=${oppId}`} size="lg">Destravar este edital</LinkButton>
            </div>
          ) : (
            <>
              {profile ? (
                <p className="mt-5 rounded-xl bg-neutral-950/60 px-4 py-3 text-sm text-neutral-300">
                  Você vai como <b className="text-neutral-50">{profile.name}</b> · {profile.personType}
                  {profile.artAreas?.length ? ` · ${profile.artAreas.slice(0, 3).join(", ")}` : ""}
                  {profile.uf ? ` · ${profile.uf}` : ""}
                </p>
              ) : (
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Field label="Nome artístico">
                    <Input value={guest.name} onChange={(ev) => setGuest({ ...guest, name: ev.target.value })} placeholder="Como te chamam" />
                  </Field>
                  <Field label="Você se inscreve como">
                    <Select value={guest.personType} onChange={(ev) => setGuest({ ...guest, personType: ev.target.value })}>
                      <option>Pessoa Física</option>
                      <option>MEI</option>
                      <option>Pessoa Jurídica</option>
                      <option>Coletivo sem CNPJ</option>
                    </Select>
                  </Field>
                  <Field label="Tua área">
                    <Input value={guest.artAreas} onChange={(ev) => setGuest({ ...guest, artAreas: ev.target.value })} placeholder="Música, teatro, audiovisual" />
                  </Field>
                  <Field label="Estado">
                    <Input maxLength={2} value={guest.uf} onChange={(ev) => setGuest({ ...guest, uf: ev.target.value.toUpperCase() })} placeholder="SP" />
                  </Field>
                </div>
              )}

              {ineligible && (
                <div className="mt-4">
                  <Notice tone="bad">
                    Este edital aceita {opp.proponentTypes.join(", ")}. Como {who.personType.toLowerCase()} você pode ser inabilitado na largada. A banca vai te cobrar isso.
                  </Notice>
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button size="lg" disabled={!ready} onClick={() => { setStarted(true); void sendTurn(); }}>
                  Começar a sabatina
                </Button>
                {!profile && ready && (
                  <Link href={`/comecar?voltar=${encodeURIComponent(here)}`} className="text-sm text-neutral-400 underline underline-offset-2 hover:text-neutral-100">
                    Criar perfil pra salvar o resultado
                  </Link>
                )}
              </div>
            </>
          )}
        </Card>
      </Page>
    );
  }

  // ───────── sabatina em andamento ─────────
  const answered = messages.filter((m) => m.role === "user").length;
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-3xl flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">Sabatina de banca</p>
          <h1 className="mt-1 line-clamp-2 text-2xl text-neutral-50 sm:text-3xl">{v.title}</h1>
        </div>
        {!verdict && answered > 0 && <Badge className="mt-1">{answered} {answered === 1 ? "resposta" : "respostas"}</Badge>}
      </div>

      {!verdict && profile && (
        <div className="mb-5">
          <VoiceSabatina opportunityId={id} profileEmail={email} />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3" aria-live="polite">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              m.role === "user" ? "self-end bg-emerald-400 text-neutral-950" : "self-start border border-neutral-800 bg-neutral-900 text-neutral-200"
            }`}
          >
            {m.role === "model" && <p className="mb-1 font-mono text-[10px] uppercase tracking-wider text-emerald-400">Parecerista</p>}
            <span className="whitespace-pre-wrap">{m.role === "model" ? <RichText text={m.text} /> : m.text}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 self-start rounded-2xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
            <span className="flex gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-500" />
            </span>
            {messages.length === 0 ? "A banca está lendo teu perfil e o edital" : "Parecerista avaliando tua resposta"}
          </div>
        )}

        {failed && (
          <Notice tone="bad">
            A banca não respondeu agora. Tua resposta ficou guardada no campo abaixo.{" "}
            <button className="font-semibold underline underline-offset-2" onClick={() => { const t = failed.text; if (t) setInput(""); void sendTurn(t); }}>
              Tentar de novo
            </button>
          </Notice>
        )}

        {verdict && (
          <section className={`rounded-3xl border p-5 sm:p-7 ${verdict.documentalGate === "fail" ? "border-red-500/50 bg-red-500/5" : "border-emerald-500/40 bg-emerald-500/5"}`} aria-label="Parecer da banca">
            {verdict.documentalGate === "fail" && (
              <div className="mb-5">
                <Notice tone="bad">
                  <b>Inabilitada por formalidade.</b> Do jeito que está, a proposta seria eliminada antes de alguém ler o mérito. É assim que cai a maioria das inscrições.
                </Notice>
              </div>
            )}
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className={`font-display text-7xl leading-none sm:text-8xl ${verdict.score >= 70 ? "text-emerald-300" : verdict.score >= 50 ? "text-amber-300" : "text-red-300"}`}>
                {verdict.score}
              </p>
              <p className="pb-2 text-sm text-neutral-400">
                de 100 · {verdict.score >= 70 ? "competitiva" : verdict.score >= 50 ? "passa raspando no corte" : "abaixo do corte típico (50 a 60)"}
              </p>
            </div>
            <p className="mt-4 text-base leading-relaxed text-neutral-100">{verdict.summary}</p>

            {verdict.criterionScores && verdict.criterionScores.length > 0 && (
              <div className="mt-6 flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-neutral-200">Nota por critério</h2>
                {verdict.criterionScores.map((c) => (
                  <div key={c.criterion}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-neutral-200">{c.criterion}</span>
                      <span className={`shrink-0 font-mono ${c.score === 0 ? "text-red-300" : c.score <= 5 ? "text-amber-300" : "text-neutral-400"}`}>{c.score}/10</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-neutral-800">
                      <div className={`h-1.5 rounded-full ${c.score === 0 ? "bg-red-400" : c.score <= 5 ? "bg-amber-400" : "bg-emerald-400"}`} style={{ width: `${Math.max(3, c.score * 10)}%` }} />
                    </div>
                    {c.note && <p className="mt-1 text-xs leading-relaxed text-neutral-500">{c.note}</p>}
                  </div>
                ))}
              </div>
            )}

            {verdict.gaps.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-neutral-200">O que arrumar antes de inscrever</h2>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-amber-200">
                  {verdict.gaps.map((g) => <li key={g}>{g}</li>)}
                </ul>
              </div>
            )}

            {verdict.missingDocs.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-neutral-200">Documentos que faltam</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-neutral-300">
                  {verdict.missingDocs.map((d) => <li key={d}>{d}</li>)}
                </ul>
              </div>
            )}

            {verdict.injectionDetected && (
              <p className="mt-5 text-xs leading-relaxed text-neutral-500">
                O texto deste edital tinha instruções escondidas tentando manipular a avaliação. Foram ignoradas.
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-2">
              {profile ? (
                <Button onClick={trackIt} disabled={added}>{added ? "Guardado no pipeline" : "Guardar no pipeline com a nota"}</Button>
              ) : (
                <LinkButton href={`/comecar?voltar=${encodeURIComponent(here)}`}>Criar perfil pra salvar</LinkButton>
              )}
              {verdict.missingDocs.length > 0 && profile && <LinkButton href="/documentos" variant="secondary">Abrir meus documentos</LinkButton>}
              <Button variant="ghost" onClick={restart}>Refazer a sabatina</Button>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-neutral-500">
              Isto é uma simulação pra você se preparar. A decisão é sempre da banca real do edital.
            </p>
          </section>
        )}
        <div ref={bottom} />
      </div>

      {!verdict && (
        <form
          className="sticky bottom-0 -mx-4 mt-4 flex items-end gap-2 bg-gradient-to-t from-neutral-950 via-neutral-950 to-transparent px-4 pb-4 pt-6 sm:-mx-6 sm:px-6"
          onSubmit={(ev) => {
            ev.preventDefault();
            const t = input.trim();
            if (!t || loading) return;
            setInput("");
            void sendTurn(t);
          }}
        >
          <label className="sr-only" htmlFor="resposta">Tua resposta pra banca</label>
          <Textarea
            id="resposta"
            rows={1}
            className="max-h-40 !min-h-11 flex-1 resize-none"
            placeholder="Responde como responderia pra banca"
            value={input}
            onChange={(ev) => setInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && !ev.shiftKey) {
                ev.preventDefault();
                ev.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <Button type="submit" size="lg" className="h-11" disabled={loading || !input.trim()}>
            Enviar
          </Button>
        </form>
      )}
    </main>
  );
}
