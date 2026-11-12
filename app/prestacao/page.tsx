"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import { SignIn } from "@/components/SignIn";
import { tidyTitle } from "@/lib/format";
import { Button, Card, Field, Input, Notice, Page, PageHeader, SectionTitle, Select, Textarea } from "@/components/ui";

// Prestação de contas — o "depois" que todo edital exige e ninguém ajuda.
// Gera o Relatório de Objeto (modelo Anexo V PNAB) em PDF pra colar no Mapas.
type Item = { _id: string; opportunity: { _id: string; name: string; sourceName: string; totalResource?: number } };

const FIELDS: { key: string; label: string; hint: string; rows?: number }[] = [
  { key: "resumo", label: "Resumo da execução", hint: "Um parágrafo: o que foi feito e que benefício trouxe.", rows: 3 },
  { key: "acoes", label: "Ações desenvolvidas", hint: "Datas, locais, horários e o que mudou em relação ao plano.", rows: 3 },
  { key: "produtos", label: "Produtos gerados", hint: "O que foi produzido e onde o público acessa.", rows: 2 },
  { key: "publico", label: "Público alcançado", hint: "Quantidade e como você mediu: lista de presença, bilheteria, visualizações.", rows: 2 },
  { key: "equipe", label: "Equipe do projeto", hint: "Quantas pessoas trabalharam e o que mudou na equipe.", rows: 2 },
  { key: "locais", label: "Locais de realização", hint: "Fixo, itinerante, ou local base e outras ações.", rows: 1 },
  { key: "divulgacao", label: "Divulgação", hint: "Canais usados. Confere se as marcas obrigatórias do edital apareceram.", rows: 2 },
  { key: "contrapartida", label: "Contrapartida social", hint: "O que foi entregue, quando e onde.", rows: 2 },
  { key: "anexos", label: "Anexos", hint: "Um por linha: listas de presença, fotos, vídeos, clipping.", rows: 2 },
];

type Meta = { texto: string; status: "integral" | "parcial" | "nao"; justificativa?: string };
const DRAFT = "manager_prestacao_rascunho";

export default function Prestacao() {
  const { email, token, ready } = useAuthEmail();
  const profile = useMyProfile() as any;
  const items = useQuery(
    api.pipeline.listForProfile,
    profile ? { profileId: profile._id } : "skip"
  ) as Item[] | undefined;

  const [oppId, setOppId] = useState("");
  const [acoesStatus, setAcoesStatus] = useState("todas conforme planejado");
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [metas, setMetas] = useState<Meta[]>([{ texto: "", status: "integral" }]);
  const [loaded, setLoaded] = useState(false);
  const setMeta = (i: number, patch: Partial<Meta>) => setMetas((ms) => ms.map((m, n) => (n === i ? { ...m, ...patch } : m)));

  // rascunho no aparelho: relatório longo não pode sumir num F5
  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT) ?? "null");
      if (d) {
        if (d.form) setForm(d.form);
        if (Array.isArray(d.metas) && d.metas.length) setMetas(d.metas);
        if (d.manual) setManual(d.manual);
        if (d.acoesStatus) setAcoesStatus(d.acoesStatus);
        if (d.oppId) setOppId(d.oppId);
      }
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(DRAFT, JSON.stringify({ form, metas, manual, acoesStatus, oppId }));
    } catch {}
  }, [loaded, form, metas, manual, acoesStatus, oppId]);

  if (!profile) {
    return (
      <SignIn
        title="Prestação de contas"
        blurb="O relatório de execução do edital, no formato que a plataforma pede."
        profile={profile}
      />
    );
  }

  const picked = items?.find((i) => i.opportunity._id === oppId)?.opportunity;
  // sem edital no pipeline também dá: a pessoa digita o nome do projeto
  const opp = picked ?? (manual.trim() ? { name: manual.trim(), sourceName: "", totalResource: undefined as number | undefined } : null);
  const filled = FIELDS.filter((f) => (form[f.key] ?? "").trim()).length + (metas.some((m) => m.texto.trim()) ? 1 : 0);
  const total = FIELDS.length + 1;

  async function gerar() {
    if (!opp) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/prestacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { name: profile.name, personType: profile.personType },
          opportunity: { name: opp.name, sourceName: opp.sourceName, totalResource: opp.totalResource },
          exec: { ...form, acoesStatus, metas: metas.filter((m) => m.texto.trim()) },
        }),
      });
      if (!res.ok) throw new Error("pdf");
      window.open(URL.createObjectURL(await res.blob()), "_blank");
    } catch {
      setErr("Não deu pra gerar o relatório agora. O que você escreveu continua salvo; tenta de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page width="max-w-3xl">
      <PageHeader
        title="Prestação de contas"
        description="Executou o projeto? Preenche o que aconteceu e sai o Relatório de Objeto no modelo do Anexo V (PNAB e Mapas Culturais), pronto pra anexar na plataforma."
      />

      <div className="flex flex-col gap-5">
        <Card as="section">
          <SectionTitle>O projeto</SectionTitle>
          <div className="flex flex-col gap-4">
            {(items ?? []).length > 0 && (
              <Field label="Edital do teu pipeline">
                <Select value={oppId} onChange={(e) => setOppId(e.target.value)}>
                  <option value="">Escolher</option>
                  {(items ?? []).map((i) => (
                    <option key={i._id} value={i.opportunity._id}>
                      {tidyTitle(i.opportunity.name).slice(0, 90)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {!picked && (
              <Field
                label={(items ?? []).length > 0 ? "Ou escreve o nome do projeto" : "Nome do projeto ou do edital"}
                hint="Como está no termo de execução cultural."
              >
                <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ex.: EP Maré Alta, edital PNAB 02/2026" />
              </Field>
            )}
            <Field label="As ações planejadas foram realizadas?">
              <Select value={acoesStatus} onChange={(e) => setAcoesStatus(e.target.value)}>
                <option value="todas conforme planejado">Sim, todas conforme o planejado</option>
                <option value="todas com adaptações">Sim, todas, com adaptações</option>
                <option value="parte não feita">Uma parte não foi feita</option>
                <option value="não foram feitas conforme planejado">Não foram feitas conforme o planejado</option>
              </Select>
            </Field>
          </div>
        </Card>

        <Card as="section">
          <SectionTitle>Metas</SectionTitle>
          <p className="mb-4 text-sm text-neutral-400">Uma linha pra cada meta do plano de trabalho. Meta parcial ou não cumprida precisa de justificativa.</p>
          <ul className="flex flex-col gap-4">
            {metas.map((m, i) => (
              <li key={i} className="grid gap-2 sm:grid-cols-[1fr_11rem_auto] sm:items-end">
                <Field label={`Meta ${i + 1}`}>
                  <Input value={m.texto} onChange={(e) => setMeta(i, { texto: e.target.value })} placeholder="Ex.: realizar 4 shows gratuitos" />
                </Field>
                <Field label="Cumprimento">
                  <Select value={m.status} onChange={(e) => setMeta(i, { status: e.target.value as Meta["status"] })}>
                    <option value="integral">Cumprida</option>
                    <option value="parcial">Parcial</option>
                    <option value="nao">Não cumprida</option>
                  </Select>
                </Field>
                <Button type="button" variant="ghost" size="sm" className="mb-1.5 justify-self-end" disabled={metas.length === 1} onClick={() => setMetas(metas.filter((_, n) => n !== i))}>
                  Remover
                </Button>
                {m.status !== "integral" && (
                  <Field label="Justificativa" className="sm:col-span-3">
                    <Input value={m.justificativa ?? ""} onChange={(e) => setMeta(i, { justificativa: e.target.value })} placeholder="O que impediu e o que foi feito no lugar" />
                  </Field>
                )}
              </li>
            ))}
          </ul>
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setMetas([...metas, { texto: "", status: "integral" }])}>
            Adicionar meta
          </Button>
        </Card>

        <Card as="section">
          <SectionTitle aside={<span className="text-sm text-neutral-500">{filled} de {total} preenchidos</span>}>O que aconteceu</SectionTitle>
          <div className="flex flex-col gap-4">
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label} hint={f.hint}>
                <Textarea rows={f.rows ?? 2} className="!min-h-0" value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              </Field>
            ))}
          </div>
        </Card>
      </div>

      {err && <div className="mt-5"><Notice tone="bad">{err}</Notice></div>}

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-800/70 bg-neutral-950/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Button size="lg" disabled={!opp} loading={busy} onClick={gerar}>
          Gerar relatório em PDF
        </Button>
        <span className="text-sm text-neutral-500">
          {!opp ? "Escolhe ou escreve o projeto pra gerar." : "Teu rascunho fica salvo neste aparelho."}
        </span>
      </div>

      <p className="mt-5 text-sm leading-relaxed text-neutral-500">
        Cada fomento publica o próprio anexo: confere com o modelo oficial do teu edital antes de enviar. Guarda notas e comprovantes por 5 anos depois do fim da vigência.
      </p>
    </Page>
  );
}
