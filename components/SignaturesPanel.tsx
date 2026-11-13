"use client";

// Aba Assinaturas de /documentos

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import { ZapConnect, IntakeButton } from "@/components/ZapConnect";
import { Badge, Button, Card, EmptyState, Field, Input, Notice, SectionTitle, Skeleton, Textarea } from "@/components/ui";

type Signer = { name: string; role?: string; phone?: string; order: number; token: string; status: string; signedAt?: number };
type Doc = { _id: string; title: string; sequential: boolean; deadline?: string; createdAt: number; signers: Signer[] };

const blank = () => ({ name: "", role: "", phone: "" });

function waLink(s: Signer, d: Doc, from: string, origin: string) {
  const url = `${origin}/assinar/${s.token}`;
  const prazo = d.deadline ? ` até ${d.deadline.split("-").reverse().join("/")}` : "";
  const text = `Oi ${s.name.split(" ")[0]}! Aqui é ${from}. Preciso da tua assinatura em "${d.title}"${prazo}. Leva 1 minuto, é só abrir e assinar com o dedo: ${url}`;
  const phone = s.phone ? (s.phone.length <= 11 ? `55${s.phone}` : s.phone) : "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function SignaturesPanel() {
  const { token } = useAuthEmail();
  const profile = useMyProfile();
  const docs = useQuery(api.signDocs.listMine, token ? { token } : "skip") as Doc[] | undefined;
  const create = useMutation(api.signDocs.create);
  const remove = useMutation(api.signDocs.remove);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sequential, setSequential] = useState(true);
  const [deadline, setDeadline] = useState("");
  const [people, setPeople] = useState([blank(), blank()]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  if (!profile) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const signers = people.filter((p) => p.name.trim());
    if (!title.trim() || !body.trim()) return setErr("Dá um título e cola o texto do documento.");
    if (!signers.length) return setErr("Coloca pelo menos uma pessoa pra assinar.");
    setBusy(true);
    try {
      await create({ token, title, body, sequential, deadline: deadline || undefined, signers });
      setOpen(false);
      setTitle(""); setBody(""); setDeadline(""); setPeople([blank(), blank()]);
    } catch {
      setErr("Não deu pra criar agora. Tenta de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <ZapConnect />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-neutral-400">
          Declaração de edital, anuência dos integrantes, carta de compromisso: cada pessoa recebe um link, completa os dados e assina com o dedo. No fim sai um PDF só, assinado por todos.
        </p>
        <Button onClick={() => {
          // a banda do cadastro já entra como quem assina
          const team = (profile as { team?: { name: string; role?: string; phone?: string }[] }).team;
          if (!open && team?.length && people.every((p) => !p.name)) setPeople(team.map((m) => ({ name: m.name, role: m.role ?? "", phone: m.phone ?? "" })));
          setOpen((o) => !o);
        }}>{open ? "Fechar" : "Novo documento"}</Button>
      </div>

      {open && (
        <Card as="section" className="mb-8">
          <SectionTitle>Novo documento pra assinar</SectionTitle>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Field label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Declaração de anuência dos integrantes" /></Field>
            <Field label="Texto do documento" hint="Cola o modelo do anexo do edital já preenchido. O coach também monta isso pra você.">
              <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            <div>
              <p className="mb-2 text-sm font-medium text-neutral-200">Quem assina, na ordem</p>
              <div className="flex flex-col gap-2">
                {people.map((p, i) => (
                  <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr] gap-2 sm:grid-cols-[1.5rem_1.4fr_1fr_1fr_2rem]">
                    <span className="pt-2.5 text-center font-mono text-xs text-neutral-500">{i + 1}</span>
                    <Input aria-label={`Nome ${i + 1}`} value={p.name} placeholder="Nome completo" onChange={(e) => setPeople((ps) => ps.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} />
                    <Input aria-label={`Função ${i + 1}`} value={p.role} placeholder="Função (baixista…)" onChange={(e) => setPeople((ps) => ps.map((x, n) => (n === i ? { ...x, role: e.target.value } : x)))} />
                    <Input aria-label={`WhatsApp ${i + 1}`} inputMode="tel" value={p.phone} placeholder="WhatsApp com DDD" className="col-start-2 sm:col-start-auto" onChange={(e) => setPeople((ps) => ps.map((x, n) => (n === i ? { ...x, phone: e.target.value } : x)))} />
                    <button type="button" aria-label="Tirar" className="hidden text-neutral-500 hover:text-neutral-200 sm:block" onClick={() => setPeople((ps) => ps.filter((_, n) => n !== i))}>✕</button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => setPeople((ps) => [...ps, blank()])}>+ pessoa</Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Prazo pra assinar"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
              <label className="flex items-center gap-2 pt-6 text-sm text-neutral-300">
                <input type="checkbox" checked={sequential} onChange={(e) => setSequential(e.target.checked)} />
                Assinar na ordem (cada um só depois do anterior)
              </label>
            </div>
            {err && <Notice tone="bad">{err}</Notice>}
            <Button type="submit" loading={busy}>Criar e gerar os links</Button>
          </form>
        </Card>
      )}

      {docs === undefined ? (
        <Skeleton className="h-40" />
      ) : docs.length === 0 ? (
        <EmptyState icon="✍️" title="Nenhum documento ainda">
          Cria um aqui ou pede pro coach: &quot;monta a declaração de anuência do edital X pra banda assinar&quot;.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {docs.map((d) => {
            const done = d.signers.filter((s) => s.status === "assinado").length;
            const next = d.sequential ? d.signers.find((s) => s.status !== "assinado") : undefined;
            return (
              <li key={d._id} className="rounded-2xl border border-neutral-800 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold text-neutral-50">{d.title}</h2>
                    <p className="mt-1 text-xs text-neutral-500">
                      {d.sequential ? "Na ordem" : "Qualquer ordem"}
                      {d.deadline ? ` · até ${d.deadline.split("-").reverse().join("/")}` : ""}
                    </p>
                  </div>
                  <Badge tone={done === d.signers.length ? "good" : "warn"}>{done}/{d.signers.length} assinaram</Badge>
                </div>
                <ol className="mt-4 flex flex-col gap-2">
                  {d.signers.map((s) => {
                    const isNext = next?.token === s.token || (!d.sequential && s.status !== "assinado");
                    return (
                      <li key={s.token} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
                        <span className="w-5 font-mono text-xs text-neutral-500">{s.order}</span>
                        <span className="min-w-0 flex-1 text-neutral-200">
                          {s.name}{s.role ? <span className="text-neutral-500"> · {s.role}</span> : null}
                        </span>
                        {s.status === "assinado" ? (
                          <span className="text-xs text-emerald-300">assinou {new Date(s.signedAt!).toLocaleDateString("pt-BR")}</span>
                        ) : isNext ? (
                          <>
                            <a href={waLink(s, d, profile.name, origin)} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-400 px-3 py-1 text-xs font-semibold text-neutral-950 hover:bg-emerald-300">Mandar no WhatsApp</a>
                            <button className="text-xs text-neutral-400 underline" onClick={() => { void navigator.clipboard.writeText(`${origin}/assinar/${s.token}`); setCopied(s.token); }}>
                              {copied === s.token ? "Link copiado" : "Copiar link"}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-neutral-500">espera a vez</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
                <IntakeButton docId={d._id} pending={d.signers.some((s) => s.status !== "assinado")} />
                <div className="mt-4 flex items-center gap-3 border-t border-neutral-800 pt-3 text-sm">
                  <a href={`/api/assinatura?id=${d._id}&token=${token}`} target="_blank" className="font-semibold text-emerald-300 hover:underline">
                    {done === d.signers.length ? "Baixar PDF assinado" : "Ver PDF parcial"}
                  </a>
                  <span className="flex-1" />
                  {confirmDel === d._id ? (
                    <>
                      <Button size="sm" variant="danger" onClick={() => void remove({ token, id: d._id as never })}>Apagar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDel(null)}>Não</Button>
                    </>
                  ) : (
                    <button className="text-xs text-neutral-500 hover:text-neutral-200" onClick={() => setConfirmDel(d._id)}>Apagar</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
