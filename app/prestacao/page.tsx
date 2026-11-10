"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { useAuthEmail } from "@/lib/useAuth";

// Prestação de contas — o "depois" que todo edital exige e ninguém ajuda.
// Gera o Relatório de Objeto (modelo Anexo V PNAB) em PDF pra colar no Mapas.
type Item = { _id: string; opportunity: { _id: string; name: string; sourceName: string; totalResource?: number } };

const FIELDS: { key: string; label: string; hint: string; rows?: number }[] = [
  { key: "resumo", label: "Resumo da execução", hint: "resultados e benefícios do projeto em 1 parágrafo", rows: 3 },
  { key: "acoes", label: "Ações desenvolvidas", hint: "datas, locais, horários, alterações e impactos nas metas", rows: 3 },
  { key: "metas", label: "Metas e cumprimento", hint: "uma por linha — formato: meta | integral|parcial|nao | justificativa", rows: 4 },
  { key: "produtos", label: "Produtos gerados", hint: "o que foi produzido e como fica acessível ao público", rows: 2 },
  { key: "publico", label: "Público alcançado", hint: "quantidade + como mediu (lista de presença, bilheteria)", rows: 2 },
  { key: "equipe", label: "Equipe do projeto", hint: "quantas pessoas e mudanças em relação ao plano", rows: 2 },
  { key: "locais", label: "Locais de realização", hint: "fixo, itinerante ou local base + outras ações", rows: 1 },
  { key: "divulgacao", label: "Divulgação", hint: "canais usados — lembra das marcas/logos obrigatórias", rows: 2 },
  { key: "contrapartida", label: "Contrapartida social", hint: "o que foi executado, quando e onde", rows: 2 },
  { key: "anexos", label: "Anexos", hint: "listas, fotos, vídeos, clipping — um por linha", rows: 2 },
];

export default function Prestacao() {
  const { email, setEmail, locked, authEnabled } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as any;
  const items = useQuery(
    api.pipeline.listForProfile,
    profile ? { profileId: profile._id } : "skip"
  ) as Item[] | undefined;

  const [oppId, setOppId] = useState("");
  const [acoesStatus, setAcoesStatus] = useState("todas conforme planejado");
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Prestação de contas</h1>
        <p className="text-sm text-neutral-400">Entre com seu email pra gerar o relatório.</p>
        {authEnabled && !locked && (
            <a href="/login" className="rounded-xl bg-sky-500 px-4 py-3 text-center font-semibold text-black">
              Entrar com WorkOS &rarr;
            </a>
          )}
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => { e.preventDefault(); localStorage.setItem("manager_email", email); setEmail(email); }}
        >
          <input className="rounded-xl bg-neutral-900 px-4 py-3" placeholder="seu@email.com" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black">Entrar</button>
        </form>
      </main>
    );
  }

  const opp = items?.find((i) => i.opportunity._id === oppId)?.opportunity;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <header className="mb-8">
        <Link href="/" className="font-mono text-xs text-emerald-400">manager_</Link>
        <h1 className="text-3xl font-bold">Prestação de contas</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Executou o edital? Agora prova. O coach monta o Relatório de Objeto no formato Anexo V
          (PNAB/Mapas) — tu cola na plataforma ou anexa o PDF.
        </p>
      </header>

      <label className="mb-4 flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase text-neutral-500">Projeto executado</span>
        <select
          className="rounded-xl bg-neutral-900 px-4 py-3"
          value={oppId}
          onChange={(e) => setOppId(e.target.value)}
        >
          <option value="">escolhe do teu pipeline…</option>
          {(items ?? []).map((i) => (
            <option key={i._id} value={i.opportunity._id}>
              {i.opportunity.name} — {i.opportunity.sourceName}
            </option>
          ))}
        </select>
      </label>

      <label className="mb-4 flex flex-col gap-1">
        <span className="font-mono text-[10px] uppercase text-neutral-500">As ações planejadas foram realizadas?</span>
        <select className="rounded-xl bg-neutral-900 px-4 py-3" value={acoesStatus} onChange={(e) => setAcoesStatus(e.target.value)}>
          <option>todas conforme planejado</option>
          <option>todas com adaptações</option>
          <option>parte não feita</option>
          <option>não foram feitas conforme planejado</option>
        </select>
      </label>

      {FIELDS.map((f) => (
        <label key={f.key} className="mb-4 flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase text-neutral-500">{f.label}</span>
          <textarea
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm"
            placeholder={f.hint}
            rows={f.rows ?? 2}
            value={form[f.key] ?? ""}
            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
          />
        </label>
      ))}

      <button
        disabled={!opp || busy}
        onClick={async () => {
          setBusy(true);
          try {
            const metas = (form.metas ?? "").split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
              const [texto, st, just] = l.split("|").map((s) => s.trim());
              return {
                texto,
                status: (st?.startsWith("par") ? "parcial" : st?.startsWith("n") ? "nao" : "integral") as "integral" | "parcial" | "nao",
                justificativa: just,
              };
            });
            const res = await fetch("/api/prestacao", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profile: { name: profile.name, personType: profile.personType },
                opportunity: { name: opp!.name, sourceName: opp!.sourceName, totalResource: opp!.totalResource },
                exec: { ...form, acoesStatus, metas },
              }),
            });
            if (res.ok) {
              const blob = await res.blob();
              window.open(URL.createObjectURL(blob), "_blank");
            }
          } finally {
            setBusy(false);
          }
        }}
        className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black disabled:opacity-40"
      >
        {busy ? "gerando…" : "📄 gerar Relatório de Objeto (Anexo V)"}
      </button>

      <p className="mt-3 text-xs text-neutral-500">
        Confere sempre o modelo oficial do teu edital — cada fomento publica seu Anexo próprio.
        Guarda os documentos por 5 anos depois do fim da vigência.
      </p>
    </main>
  );
}
