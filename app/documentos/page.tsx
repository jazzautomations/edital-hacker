"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import type { Profile } from "@/lib/types";
import { SignIn } from "@/components/SignIn";
import { SignaturesPanel } from "@/components/SignaturesPanel";
import {
  Badge, Button, Card, EmptyState, Field, Input, Notice, Page, PageHeader, Select, SectionTitle, Skeleton, dataCurta, diasAte,
} from "@/components/ui";

type Doc = {
  _id: string;
  name: string;
  kind: string;
  expiresAt?: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  url?: string | null;
  createdAt?: number;
};

const CATEGORIES = [
  { id: "identidade", label: "Identidade e endereço" },
  { id: "certidoes", label: "Certidões" },
  { id: "cadastro", label: "Cadastro e banco" },
  { id: "portfolio", label: "Portfólio e imprensa" },
  { id: "contratos", label: "Contratos" },
  { id: "comprovantes", label: "Notas e comprovantes" },
  { id: "outros", label: "Outros" },
] as const;
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label]));

// O que quase todo edital cultural pede na habilitação. `match` reconhece o
// documento pelo nome, então também vale pra quem já tinha cadastrado antes.
const ESSENTIALS: { id: string; label: string; kind: string; expires: boolean; match: RegExp; only?: "pf" | "pj"; why: string }[] = [
  { id: "rg", label: "RG e CPF (ou CNH)", kind: "identidade", expires: false, match: /\b(rg|cpf|cnh|identidade)\b/i, why: "Identifica o proponente." },
  { id: "residencia", label: "Comprovante de residência", kind: "identidade", expires: true, match: /resid[êe]ncia|endere[çc]o/i, why: "Edital municipal e estadual exige morar no território. Costuma valer 90 dias." },
  { id: "cnd-federal", label: "Certidão negativa federal", kind: "certidoes", expires: true, match: /federal|receita|uni[ãa]o/i, why: "Débitos com a Receita e a União. Vale 180 dias." },
  { id: "cnd-estadual", label: "Certidão negativa estadual", kind: "certidoes", expires: true, match: /estadual|sefaz/i, why: "Débitos com o estado." },
  { id: "cnd-municipal", label: "Certidão negativa municipal", kind: "certidoes", expires: true, match: /municipal|prefeitura|iss/i, why: "Débitos com a prefeitura." },
  { id: "cndt", label: "Certidão trabalhista (CNDT)", kind: "certidoes", expires: true, match: /trabalhista|cndt/i, why: "Débitos na Justiça do Trabalho. Vale 180 dias." },
  { id: "fgts", label: "Regularidade do FGTS", kind: "certidoes", expires: true, match: /fgts/i, only: "pj", why: "Exigida de quem tem CNPJ. Vale 30 dias." },
  { id: "cnpj", label: "Cartão CNPJ ou CCMEI", kind: "cadastro", expires: false, match: /cnpj|ccmei|contrato social/i, only: "pj", why: "Prova que a empresa existe e qual a atividade." },
  { id: "banco", label: "Dados bancários", kind: "cadastro", expires: false, match: /banc[áa]ri|conta|extrato/i, why: "Conta no nome do proponente pra receber o recurso." },
  { id: "portfolio", label: "Portfólio ou currículo artístico", kind: "portfolio", expires: false, match: /portf[óo]lio|curr[íi]culo|clipping|release/i, why: "É o que a banca usa pra pontuar tua trajetória." },
];

const MAX = 15 * 1024 * 1024;

function statusOf(d: Doc): { tone: "good" | "warn" | "bad" | "neutral"; text: string } {
  const days = diasAte(d.expiresAt);
  if (days === null) return { tone: "neutral", text: "sem validade" };
  if (days < 0) return { tone: "bad", text: `venceu há ${-days} ${-days === 1 ? "dia" : "dias"}` };
  if (days === 0) return { tone: "bad", text: "vence hoje" };
  if (days <= 30) return { tone: "warn", text: `vence em ${days} ${days === 1 ? "dia" : "dias"}` };
  return { tone: "good", text: `válido até ${dataCurta(d.expiresAt, true)}` };
}

const kb = (n?: number) => (!n ? "" : n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export default function Documentos() {
  const { email, token, ready } = useAuthEmail();
  const profile = useMyProfile();
  const docs = useQuery(api.documents.listForProfile, profile ? { profileId: profile._id as any } : "skip") as Doc[] | undefined;
  const genUrl = useMutation(api.documents.generateUploadUrl);
  const add = useMutation(api.documents.add);
  const update = useMutation(api.documents.update);
  const remove = useMutation(api.documents.remove);

  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<{ name: string; kind: string; expiresAt: string; file: File | null }>({
    name: "", kind: "certidoes", expiresAt: "", file: null,
  });
  const [aba, setAba] = useState<"cofre" | "assinaturas">("cofre");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("aba") === "assinaturas") setAba("assinaturas");
  }, []);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("todos");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const isPj = profile ? /MEI|Jur[íi]dica/i.test(profile.personType) : false;
  const essentials = useMemo(() => ESSENTIALS.filter((e) => !e.only || (e.only === "pj") === isPj), [isPj]);

  if (!profile) {
    return (
      <SignIn
        title="Teus documentos"
        blurb="Certidões, portfólio e contratos num lugar só, com aviso antes de vencer."
        profile={profile}
      />
    );
  }

  const list = docs ?? [];
  const have = (e: (typeof ESSENTIALS)[number]) =>
    list.find((d) => e.match.test(d.name) && (diasAte(d.expiresAt) ?? 1) >= 0);
  const done = essentials.filter((e) => have(e)).length;
  const expired = list.filter((d) => (diasAte(d.expiresAt) ?? 1) < 0);
  const soon = list.filter((d) => {
    const n = diasAte(d.expiresAt);
    return n !== null && n >= 0 && n <= 30;
  });
  const shown = filter === "todos" ? list : list.filter((d) => d.kind === filter);

  function pickFile(f: File | null) {
    if (!f) return;
    if (f.size > MAX) {
      setErr(`"${f.name}" tem ${kb(f.size)}. O limite é 15 MB. Comprime o PDF ou manda uma foto menor.`);
      return;
    }
    setErr(null);
    setOpen(true);
    setForm((s) => ({ ...s, file: f, name: s.name || f.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " ") }));
  }

  function startFor(e: (typeof ESSENTIALS)[number]) {
    setForm({ name: e.label, kind: e.kind, expiresAt: "", file: null });
    setErr(null);
    setOpen(true);
    setTimeout(() => document.getElementById("doc-form")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }

  async function save(ev: React.FormEvent) {
    ev.preventDefault();
    if (busy || !profile) return;
    if (!form.name.trim()) {
      setErr("Dá um nome pro documento, tipo “Certidão negativa federal”.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      let storageId: string | undefined;
      if (form.file) {
        const url = await genUrl({ profileId: profile._id as any });
        const up = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": form.file.type || "application/octet-stream" },
          body: form.file,
        });
        if (!up.ok) throw new Error("upload");
        storageId = (await up.json()).storageId;
      }
      await add({
        profileId: profile._id as any,
        name: form.name.trim(),
        kind: form.kind,
        expiresAt: form.expiresAt || undefined,
        storageId: storageId as any,
        fileName: form.file?.name,
        contentType: form.file?.type || undefined,
        size: form.file?.size,
      });
      setForm({ name: "", kind: form.kind, expiresAt: "", file: null });
      if (fileRef.current) fileRef.current.value = "";
      setOpen(false);
    } catch {
      setErr("O envio falhou no meio do caminho. Confere a conexão e tenta de novo, teu arquivo continua aí.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <PageHeader
        title="Teus documentos"
        description="Guarda uma vez, usa em todo edital. Junta as assinaturas da banda sem correr atrás de ninguém."
        actions={aba === "cofre" && (
          <Button onClick={() => { setOpen(true); setErr(null); }}>
            Adicionar documento
          </Button>
        )}
      />
      <div className="mb-6 flex gap-1.5" role="tablist" aria-label="Seções de documentos">
        {([["cofre", "Cofre"], ["assinaturas", "Assinaturas"]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={aba === id}
            onClick={() => { setAba(id); window.history.replaceState(null, "", id === "cofre" ? "/documentos" : "/documentos?aba=assinaturas"); }}
            className={`rounded-full px-4 py-1.5 text-sm ${aba === id ? "bg-neutral-100 font-semibold text-neutral-950" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {aba === "assinaturas" ? <SignaturesPanel /> : (<>

      {(expired.length > 0 || soon.length > 0) && (
        <div className="mb-6 flex flex-col gap-2">
          {expired.length > 0 && (
            <Notice tone="bad">
              <b>{expired.length === 1 ? "1 documento vencido" : `${expired.length} documentos vencidos`}:</b>{" "}
              {expired.map((d) => d.name).join(", ")}. Certidão vencida é o motivo mais comum de inabilitação. Emite a nova e sobe aqui.
            </Notice>
          )}
          {soon.length > 0 && (
            <Notice tone="warn">
              <b>Vencendo em até 30 dias:</b> {soon.map((d) => `${d.name} (${dataCurta(d.expiresAt)})`).join(", ")}.
            </Notice>
          )}
        </div>
      )}

      {/* envio */}
      {open && (
        <Card className="mb-8 border-emerald-500/40" as="section">
          <form id="doc-form" onSubmit={save} className="flex flex-col gap-4" noValidate>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-neutral-50">Novo documento</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
              className={`flex flex-col items-center gap-2 rounded-2xl border border-dashed px-4 py-8 text-center ${
                dragging ? "border-emerald-400 bg-emerald-400/10" : "border-neutral-700"
              }`}
            >
              {form.file ? (
                <>
                  <p className="font-medium text-neutral-100">{form.file.name}</p>
                  <p className="text-xs text-neutral-500">{kb(form.file.size)}</p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setForm({ ...form, file: null }); if (fileRef.current) fileRef.current.value = ""; }}>
                    Trocar arquivo
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-neutral-300">Arrasta o arquivo pra cá ou</p>
                  <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                    Escolher arquivo
                  </Button>
                  <p className="text-xs text-neutral-500">PDF, foto ou Word, até 15 MB. Sem arquivo também dá: fica só o lembrete da validade.</p>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                className="sr-only"
                aria-label="Arquivo do documento"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/*"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_1fr]">
              <Field label="Nome">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Certidão negativa federal" />
              </Field>
              <Field label="Categoria">
                <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Validade" hint="Se tiver.">
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
              </Field>
            </div>

            {err && <Notice tone="bad">{err}</Notice>}

            <div className="flex justify-end">
              <Button type="submit" loading={busy}>
                {busy ? "Enviando" : "Salvar documento"}
              </Button>
            </div>
          </form>
        </Card>
      )}
      {!open && err && <div className="mb-6"><Notice tone="bad">{err}</Notice></div>}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        {/* lista */}
        <section>
          <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1">
            {[{ id: "todos", label: `Todos (${list.length})` }, ...CATEGORIES.filter((c) => list.some((d) => d.kind === c.id)).map((c) => ({ id: c.id, label: `${c.label} (${list.filter((d) => d.kind === c.id).length})` }))].map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                aria-pressed={filter === c.id}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                  filter === c.id ? "bg-neutral-800 text-neutral-50" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {docs === undefined ? (
            <div className="flex flex-col gap-3"><Skeleton className="h-20" /><Skeleton className="h-20" /></div>
          ) : list.length === 0 ? (
            <EmptyState
              icon="🗂️"
              title="Nenhum documento guardado ainda"
              action={<Button onClick={() => setOpen(true)}>Adicionar o primeiro</Button>}
            >
              Começa pelas certidões negativas: são as que mais derrubam inscrição e as que vencem mais rápido.
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-3">
              {shown
                .slice()
                .sort((a, b) => (diasAte(a.expiresAt) ?? 99999) - (diasAte(b.expiresAt) ?? 99999))
                .map((d) => {
                  const st = statusOf(d);
                  return (
                    <li key={d._id} className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-neutral-50">{d.name}</p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {CAT_LABEL[d.kind] ?? "Outros"}
                            {d.fileName ? ` · ${d.fileName}${d.size ? ` · ${kb(d.size)}` : ""}` : " · sem arquivo anexado"}
                          </p>
                        </div>
                        <Badge tone={st.tone}>{st.text}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {d.url && (
                          <a href={d.url} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center rounded-full border border-neutral-700 px-3 text-xs font-medium text-neutral-100 hover:border-neutral-500">
                            Abrir arquivo
                          </a>
                        )}
                        <label className="inline-flex items-center gap-2 text-xs text-neutral-400">
                          Validade
                          <input
                            type="date"
                            defaultValue={d.expiresAt?.slice(0, 10) ?? ""}
                            onChange={(e) => update({ id: d._id as any, expiresAt: e.target.value || undefined })}
                            className="h-8 rounded-lg bg-neutral-900 px-2 text-xs"
                            aria-label={`Validade de ${d.name}`}
                          />
                        </label>
                        <span className="flex-1" />
                        {confirmDel === d._id ? (
                          <>
                            <span className="text-xs text-neutral-400">Apagar de vez?</span>
                            <Button variant="danger" size="sm" onClick={async () => { await remove({ id: d._id as any }); setConfirmDel(null); }}>
                              Apagar
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDel(null)}>
                              Manter
                            </Button>
                          </>
                        ) : (
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDel(d._id)}>
                            Apagar
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          )}
        </section>

        {/* checklist */}
        <aside>
          <Card>
            <SectionTitle aside={<span className="text-sm font-semibold text-emerald-300">{done}/{essentials.length}</span>}>
              Kit de habilitação
            </SectionTitle>
            <div className="mb-4 h-1.5 rounded-full bg-neutral-800" role="progressbar" aria-valuemin={0} aria-valuemax={essentials.length} aria-valuenow={done} aria-label="Documentos essenciais prontos">
              <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${(done / essentials.length) * 100}%` }} />
            </div>
            <p className="mb-4 text-sm leading-relaxed text-neutral-400">
              O que quase todo edital pede de {isPj ? "quem tem CNPJ" : "pessoa física"}. Com o kit pronto, você inscreve no mesmo dia.
            </p>
            <ul className="flex flex-col gap-1">
              {essentials.map((e) => {
                const ok = have(e);
                return (
                  <li key={e.id} className="flex items-start gap-3 rounded-xl px-2 py-2">
                    <span
                      aria-hidden
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
                        ok ? "border-emerald-400 bg-emerald-400 text-neutral-950" : "border-neutral-600 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${ok ? "text-neutral-400 line-through" : "font-medium text-neutral-100"}`}>{e.label}</p>
                      {!ok && <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{e.why}</p>}
                    </div>
                    {!ok && (
                      <button onClick={() => startFor(e)} className="shrink-0 text-xs font-semibold text-emerald-300 hover:underline">
                        Enviar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </aside>
      </div>
      </>)}
    </Page>
  );
}
