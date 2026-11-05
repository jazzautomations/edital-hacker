"use client";

import { use, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import Link from "next/link";
import type { SabatinaContext, ChatTurn } from "@/lib/gemini";
import type { Opportunity } from "@/lib/types";

interface Msg {
  role: "user" | "model";
  text: string;
}

export default function Sabatina({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const opp = useQuery(api.opportunities.get, {
    id: id as Id<"opportunities">,
  }) as Opportunity | null | undefined;

  const [profile, setProfile] = useState({
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
  const [verdict, setVerdict] = useState<any>(null);
  const historyRef = useRef<ChatTurn[]>([]);

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
        name: profile.name || "Artista",
        personType: profile.personType,
        artAreas: profile.artAreas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        uf: profile.uf || undefined,
        bio: profile.bio || undefined,
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
      if (data.verdict) setVerdict(data.verdict);
    } catch (e) {
      setMessages((m) => [...m, { role: "model", text: `Erro: ${e}` }]);
    }
    setLoading(false);
  }

  if (!opp) return <main className="p-10 text-neutral-500">Carregando…</main>;

  if (!started) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Link href="/oportunidades" className="text-sm text-emerald-400">
          ← voltar
        </Link>
        <h1 className="mt-4 text-2xl font-bold">{opp.name}</h1>
        <p className="mt-1 text-neutral-400">{opp.sourceName}</p>

        {opp.enriched ? (
          <div className="mt-6 grid gap-3 text-sm">
            {opp.enriched.eligibility && (
              <p>
                <b>Elegível:</b> {opp.enriched.eligibility}
              </p>
            )}
            {opp.enriched.requiredDocs.length > 0 && (
              <p>
                <b>Docs:</b> {opp.enriched.requiredDocs.join(", ")}
              </p>
            )}
            {opp.enriched.disqualifiers.length > 0 && (
              <p className="text-red-400">
                <b>Desclassifica:</b> {opp.enriched.disqualifiers.join(" · ")}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-sm text-neutral-500">
            Edital ainda não enriquecido — a sabatina vai usar os dados básicos.
          </p>
        )}

        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-neutral-800 p-6">
          <h2 className="font-semibold">Seu perfil pra banca simular</h2>
          <input
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
            placeholder="Nome artístico"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
          <select
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
            value={profile.personType}
            onChange={(e) => setProfile({ ...profile, personType: e.target.value })}
          >
            <option>Pessoa Física</option>
            <option>MEI</option>
            <option>Pessoa Jurídica</option>
            <option>Coletivo sem CNPJ</option>
          </select>
          <input
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
            placeholder="Áreas (ex: música, teatro, audiovisual)"
            value={profile.artAreas}
            onChange={(e) => setProfile({ ...profile, artAreas: e.target.value })}
          />
          <input
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm"
            placeholder="UF"
            maxLength={2}
            value={profile.uf}
            onChange={(e) => setProfile({ ...profile, uf: e.target.value.toUpperCase() })}
          />
          <button
            onClick={() => {
              setStarted(true);
              sendTurn();
            }}
            className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black hover:bg-emerald-400"
          >
            Começar sabatina
          </button>
        </div>
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
            {verdict.gaps?.length > 0 && (
              <ul className="mt-3 list-disc pl-5 text-sm text-amber-300">
                {verdict.gaps.map((g: string) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
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
