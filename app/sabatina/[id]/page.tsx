"use client";

import { use, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import type { SabatinaContext, ChatTurn } from "@/lib/gemini";
import type { Opportunity, Profile } from "@/lib/types";

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
}

export default function Sabatina({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const oppId = id as Id<"opportunities">;
  const opp = useQuery(api.opportunities.get, { id: oppId }) as
    | Opportunity | null | undefined;

  const [email, setEmail] = useState(
    typeof window !== "undefined" ? localStorage.getItem("manager_email") ?? "" : ""
  );
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as
    | Profile | null | undefined;
  const planStatus = useQuery(
    api.billing.planStatus,
    profile ? { profileId: profile._id as any } : "skip"
  ) as
    | {
        plan: string;
        unlockedOpportunityIds: string[];
        sabatinaCount: number;
      }
    | undefined;
  const upsertProfile = useMutation(api.profiles.upsert);
  const saveSession = useMutation(api.sabatina.save);
  const addToPipeline = useMutation(api.pipeline.add);
  const setResult = useMutation(api.pipeline.setSabatinaResult);

  const [form, setForm] = useState({
    name: "",
    personType: "Pessoa Física",
    artAreas: "",
    uf: "",
    bio: "",
  });
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [added, setAdded] = useState(false);
  const historyRef = useRef<ChatTurn[]>([]);
  const profileIdRef = useRef<string | null>(null);

  const FREE_LIMIT = 1;
  const paywalled =
    profile &&
    planStatus &&
    planStatus.plan === "free" &&
    planStatus.sabatinaCount >= FREE_LIMIT &&
    !planStatus.unlockedOpportunityIds.includes(oppId as string);

  const ineligible =
    opp && opp.proponentTypes.length > 0 && form.personType &&
    !opp.proponentTypes.some((t) =>
      t.toLowerCase().includes(form.personType.split(" ")[1]?.toLowerCase() ?? form.personType.toLowerCase())
    );

  async function sendTurn(userText?: string) {
    if (!opp) return;
    setLoading(true);
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
      profile: {
        name: form.name || "Artista",
        personType: form.personType,
        artAreas: form.artAreas.split(",").map((s) => s.trim()).filter(Boolean),
        uf: form.uf || undefined,
        bio: form.bio || undefined,
      },
    };
    const history = [...historyRef.current];
    if (userText) history.push({ role: "user", text: userText });
    try {
      const res = await fetch("/api/sabatina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, history }),
      });
      const data = await res.json();
      if (userText) setMessages((m) => [...m, { role: "user", text: userText }]);
      historyRef.current = userText
        ? [...history, { role: "model", text: data.reply }]
        : [{ role: "model", text: data.reply }];
      if (data.reply) setMessages((m) => [...m, { role: "model", text: data.reply }]);
      if (data.verdict) {
        setVerdict(data.verdict);
        if (profileIdRef.current) {
          await saveSession({
            profileId: profileIdRef.current as any,
            opportunityId: oppId,
            turns: historyRef.current,
            verdict: data.verdict,
          });
        }
      }
    } catch (e) {
      setMessages((m) => [...m, { role: "model", text: `Erro: ${e}` }]);
    }
    setLoading(false);
  }

  async function start() {
    if (email) {
      const pid = await upsertProfile({
        name: form.name || email.split("@")[0],
        email,
        personType: form.personType,
        artAreas: form.artAreas.split(",").map((s) => s.trim()).filter(Boolean),
        uf: form.uf || undefined,
        bio: form.bio || undefined,
      });
      profileIdRef.current = pid as string;
      localStorage.setItem("manager_email", email);
    }
    setStarted(true);
    sendTurn();
  }

  async function trackIt() {
    if (!profileIdRef.current || !verdict) return;
    const itemId = await addToPipeline({
      profileId: profileIdRef.current as any,
      opportunityId: oppId,
      stage: "interessado",
    });
    await setResult({
      id: itemId as any,
      sabatinaScore: verdict.score,
      sabatinaSummary: verdict.summary,
    });
    setAdded(true);
  }

  if (opp === undefined) return <main className="p-10 text-neutral-500">Carregando…</main>;
  if (opp === null) return <main className="p-10">Oportunidade não encontrada.</main>;

  if (!started) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Link href="/oportunidades" className="text-sm text-emerald-400">← voltar</Link>
        <h1 className="mt-4 text-2xl font-bold">{opp.name}</h1>
        <p className="mt-1 text-neutral-400">{opp.sourceName}</p>

        {opp.enriched ? (
          <div className="mt-6 grid gap-3 text-sm">
            {opp.enriched.summary && <p className="text-neutral-300">{opp.enriched.summary}</p>}
            {opp.enriched.eligibility && <p><b>Elegível:</b> {opp.enriched.eligibility}</p>}
            {opp.enriched.requiredDocs.length > 0 && (
              <p><b>Docs:</b> {opp.enriched.requiredDocs.join(", ")}</p>
            )}
            {opp.enriched.disqualifiers.length > 0 && (
              <p className="text-red-400"><b>Desclassifica:</b> {opp.enriched.disqualifiers.join(" · ")}</p>
            )}
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-300">
            Edital ainda não enriquecido — a sabatina vai rodar com análise parcial
            (metadados básicos, sem rubrica completa).
          </p>
        )}

        {paywalled ? (
          <div className="mt-8 rounded-2xl border border-emerald-700 bg-emerald-950/30 p-6 text-center">
            <p className="text-lg font-semibold">Sua sabatina grátis já foi.</p>
            <p className="mt-1 text-sm text-neutral-400">
              Assina o Manager ou destrava só este edital com um Pix.
            </p>
            <Link
              href={`/assinatura?unlock=${oppId}`}
              className="mt-4 inline-block rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black"
            >
              Destravar →
            </Link>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-neutral-800 p-6">
            <h2 className="font-semibold">Seu perfil pra banca simular</h2>
            {ineligible && (
              <p className="rounded-lg bg-red-950/40 p-3 text-sm text-red-300">
                Atenção: o edital aceita {opp.proponentTypes.join(", ")} — seu tipo
                ({form.personType}) pode não ser elegível. A banca vai cobrar isso.
              </p>
            )}
            <input
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
              placeholder="seu@email.com (salva seu histórico)"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
              placeholder="Nome artístico"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
              value={form.personType}
              onChange={(e) => setForm({ ...form, personType: e.target.value })}
            >
              <option>Pessoa Física</option>
              <option>MEI</option>
              <option>Pessoa Jurídica</option>
              <option>Coletivo sem CNPJ</option>
            </select>
            <input
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
              placeholder="Áreas (ex: música, teatro, audiovisual)"
              value={form.artAreas}
              onChange={(e) => setForm({ ...form, artAreas: e.target.value })}
            />
            <input
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
              placeholder="UF"
              maxLength={2}
              value={form.uf}
              onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
            />
            <button
              onClick={start}
              className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black hover:bg-emerald-400"
            >
              Começar sabatina
            </button>
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col px-6 py-10">
      <div className="mb-6">
        <p className="font-mono text-xs text-emerald-400">SABATINA DE BANCA</p>
        <h1 className="text-xl font-bold">{opp.name}</h1>
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
              m.role === "user"
                ? "self-end bg-emerald-600/20 text-emerald-100"
                : "self-start bg-neutral-800"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && <p className="text-sm text-neutral-500">Parecerista pensando…</p>}
        {verdict && (
          <div className="rounded-2xl border border-emerald-700 bg-emerald-950/40 p-5">
            <p className="text-3xl font-bold text-emerald-400">
              {verdict.score}
              <span className="text-base text-neutral-400">/100</span>
            </p>
            <p className="mt-2 text-sm">{verdict.summary}</p>
            {verdict.gaps.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-amber-300">
                {verdict.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            )}
            {verdict.missingDocs.length > 0 && (
              <p className="mt-3 text-sm text-neutral-300">
                <b>Falta:</b> {verdict.missingDocs.join(", ")}
              </p>
            )}
            {verdict.warnings.map((w) => (
              <p key={w} className="mt-2 text-xs text-neutral-500">⚠ {w}</p>
            ))}
            {verdict.injectionDetected && (
              <p className="mt-2 rounded bg-red-950/50 p-2 text-xs text-red-300">
                Instruções suspeitas detectadas no texto do edital — ignoradas
                (registrado pra auditoria).
              </p>
            )}
            <button
              onClick={trackIt}
              disabled={added || !profileIdRef.current}
              className="mt-4 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {added ? "No seu pipeline ✓" : "Acompanhar no pipeline →"}
            </button>
            {!profileIdRef.current && (
              <p className="mt-1 text-xs text-neutral-500">
                (sem email salvo — volte e preencha pra trackear)
              </p>
            )}
          </div>
        )}
      </div>

      {!verdict && (
        <form
          className="mt-6 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!input.trim() || loading) return;
            sendTurn(input.trim());
            setInput("");
          }}
        >
          <input
            className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-sm"
            placeholder="Responde aí que a banca tá ouvindo…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-emerald-500 px-5 font-semibold text-black disabled:opacity-50"
          >
            →
          </button>
        </form>
      )}
    </main>
  );
}
