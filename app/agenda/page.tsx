"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import type { Profile } from "@/lib/types";
import { calcCachet } from "@/lib/cachet";
import { ruleFor } from "@/lib/docRules";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import { SignIn } from "@/components/SignIn";
import { Badge, Button, Card, EmptyState, Field, Input, LinkButton, Page, PageHeader, SectionTitle, Skeleton, Textarea, brl, dataCurta } from "@/components/ui";

const NEXT: Record<string, string> = { marcado: "feito", feito: "pago" };
const STYLE: Record<string, string> = {
  marcado: "text-sky-400",
  feito: "text-amber-400",
  pago: "text-emerald-400",
  cancelado: "text-neutral-500",
};

type Gig = {
  _id: string;
  title: string;
  venue?: string;
  date: string;
  fee?: number;
  status: string;
};

export default function Agenda() {
  const { email, token, ready } = useAuthEmail();
  const profile = useMyProfile();
  const gigs = useQuery(
    api.gigs.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as Gig[] | undefined;
  const leads = useQuery(
    api.leads.listForProfile,
    profile ? { profileId: profile._id as any } : "skip"
  ) as { _id: string; name: string; status: string; updatedAt: number }[] | undefined;
  const expiring = useQuery(
    api.documents.expiringDocs,
    profile ? { profileId: profile._id as any, withinDays: 30 } : "skip"
  ) as { _id: string; name: string; expiresAt?: string }[] | undefined;

  const add = useMutation(api.gigs.add);
  const setStatus = useMutation(api.gigs.setStatus);
  const remove = useMutation(api.gigs.remove);

  const [form, setForm] = useState({ title: "", venue: "", date: "", fee: "" });
  const [calc, setCalc] = useState({ musicians: "3", pay: "400", km: "100", tech: "0", lodge: "0", extra: "0" });
  const [showCalc, setShowCalc] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [roteiro, setRoteiro] = useState<{ gig: Gig; setlist: string; promotor: string; cnpj: string; busy: boolean } | null>(null);

  // O roteiro ECAD é o doc que impede a verba do show de ir pra outros autores.
  async function gerarRoteiro() {
    if (!roteiro || !profile) return;
    setRoteiro({ ...roteiro, busy: true });
    const faixas = roteiro.setlist
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 31)
      .map((l) => {
        const [obra, ...rest] = l.split(/[-–—]/);
        return { obra: obra.trim(), autores: rest.join("-").trim() || profile.name };
      });
    const res = await fetch("/api/roteiro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evento: {
          artista: profile.name,
          evento: roteiro.gig.title,
          local: [roteiro.gig.venue].filter(Boolean).join(" · ") || "—",
          data: roteiro.gig.date,
          promotor: roteiro.promotor || undefined,
          cnpjPromotor: roteiro.cnpj || undefined,
        },
        faixas,
      }),
    });
    setRoteiro(null);
    if (!res.ok) return;
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `roteiro-ecad-${roteiro.gig.date}.xlsx`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const cachet = calcCachet({
    musicians: Number(calc.musicians) || 1,
    payPerMusician: Number(calc.pay) || 0,
    transportKm: Number(calc.km) || 0,
    techCost: Number(calc.tech) || 0,
    lodging: Number(calc.lodge) || 0,
    extraCosts: Number(calc.extra) || 0,
  });

  if (!profile) {
    return (
      <SignIn
        title="Agenda e cachês"
        blurb="Shows, aulas e trabalhos com data, valor e o que já caiu na conta."
        profile={profile}
      />
    );
  }

  const sorted = [...(gigs ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const aReceber = sorted.filter((g) => g.status !== "pago" && g.status !== "cancelado" && g.fee)
    .reduce((s, g) => s + (g.fee ?? 0), 0);
  const recebido = sorted.filter((g) => g.status === "pago").reduce((s, g) => s + (g.fee ?? 0), 0);

  // Check-in do coach: a semana em números — o ritual que mentoria cobra caro.
  const today = new Date().toISOString().slice(0, 10);
  const in7d = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const weekGigs = sorted.filter((g) => g.date >= today && g.date <= in7d && g.status !== "cancelado");
  const overdue = sorted.filter((g) => g.date < today && g.status !== "pago" && g.status !== "cancelado" && g.fee);
  const staleLeads = (leads ?? []).filter(
    (l) => ["novo", "contatado", "respondeu"].includes(l.status) && l.updatedAt < Date.now() - 5 * 86400000
  );

  const upcoming = sorted.filter((g) => g.date >= today && g.status !== "cancelado");
  const past = sorted.filter((g) => g.date < today || g.status === "cancelado").reverse();
  const atrasado = overdue.reduce((s, g) => s + (g.fee ?? 0), 0);

  const STATUS: Record<string, { label: string; tone: "info" | "warn" | "good" | "neutral" }> = {
    marcado: { label: "marcado", tone: "info" },
    feito: { label: "feito, falta receber", tone: "warn" },
    pago: { label: "pago", tone: "good" },
    cancelado: { label: "cancelado", tone: "neutral" },
  };

  const gigRow = (g: Gig) => {
    const [, mm, dd] = g.date.split("-");
    const mes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(mm) - 1] ?? "";
    const late = g.date < today && g.status !== "pago" && g.status !== "cancelado" && g.fee;
    const st = STATUS[g.status] ?? STATUS.marcado;
    const cal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(g.title)}&dates=${g.date.replaceAll("-", "")}/${g.date.replaceAll("-", "")}${g.venue ? `&location=${encodeURIComponent(g.venue)}` : ""}&details=${encodeURIComponent(`Marcado via Manager${g.fee ? ` · cachê R$ ${g.fee.toLocaleString("pt-BR")}` : ""}`)}`;
    return (
      <li key={g._id} className={`rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 ${g.status === "cancelado" ? "opacity-50" : ""}`}>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-800 leading-none">
            <span className="font-display text-2xl text-neutral-50">{dd}</span>
            <span className="mt-0.5 text-[11px] uppercase tracking-wide text-neutral-400">{mes}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-semibold text-neutral-50">{g.title}</h3>
              <Badge tone={late ? "bad" : st.tone}>{late ? "cachê atrasado" : st.label}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-neutral-400">
              {[g.venue, g.fee ? brl(g.fee) : null].filter(Boolean).join(" · ") || "sem local e valor"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {NEXT[g.status] && (
                <Button size="sm" variant={g.status === "feito" ? "primary" : "secondary"} onClick={() => setStatus({ id: g._id as any, status: NEXT[g.status] })}>
                  {g.status === "marcado" ? "Marcar como feito" : "Recebi o cachê"}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setRoteiro({ gig: g, setlist: "", promotor: "", cnpj: "", busy: false })}>
                Roteiro ECAD
              </Button>
              <details className="relative ml-auto">
                <summary className="flex h-8 cursor-pointer list-none items-center rounded-full px-3 text-xs font-medium text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 [&::-webkit-details-marker]:hidden">
                  Mais
                </summary>
                <div className="absolute right-0 top-9 z-10 flex w-52 flex-col rounded-2xl border border-neutral-800 bg-neutral-900 p-1.5 shadow-2xl shadow-black/50">
                  <a href={cal} target="_blank" rel="noreferrer" className="rounded-xl px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
                    Pôr no Google Agenda
                  </a>
                  {g.status !== "cancelado" && g.status !== "pago" && (
                    <button onClick={() => setStatus({ id: g._id as any, status: "cancelado" })} className="rounded-xl px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800">
                      Cancelar trabalho
                    </button>
                  )}
                  {confirmDel === g._id ? (
                    <button onClick={async () => { await remove({ id: g._id as any }); setConfirmDel(null); }} className="rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-300 hover:bg-red-500/10">
                      Confirmar: apagar de vez
                    </button>
                  ) : (
                    <button onClick={() => setConfirmDel(g._id)} className="rounded-xl px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800">
                      Apagar
                    </button>
                  )}
                </div>
              </details>
            </div>
          </div>
        </div>
      </li>
    );
  };

  const hasBrief = weekGigs.length > 0 || overdue.length > 0 || staleLeads.length > 0 || (expiring?.length ?? 0) > 0;

  return (
    <Page width="max-w-4xl">
      <PageHeader
        title="Agenda e cachês"
        description="Cada trabalho com data, valor e situação do pagamento. Você sabe quanto entra antes de o mês começar."
        actions={<LinkButton href={`/epk?email=${encodeURIComponent(profile.email)}`} variant="secondary" external>Ver meu press kit</LinkButton>}
      />

      <section className="mb-6 grid grid-cols-3 gap-3" aria-label="Resumo financeiro">
        {[
          { label: "A receber", value: brl(aReceber), tone: "text-neutral-50" },
          { label: "Recebido", value: brl(recebido), tone: "text-emerald-300" },
          { label: "Atrasado", value: brl(atrasado), tone: atrasado ? "text-red-300" : "text-neutral-500" },
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5">
            <p className="text-xs text-neutral-400 sm:text-sm">{t.label}</p>
            <p className={`mt-1.5 font-display text-2xl leading-none sm:text-4xl ${t.tone}`}>{t.value}</p>
          </div>
        ))}
      </section>

      {hasBrief && (
        <Card as="section" className="mb-6 border-emerald-500/30">
          <SectionTitle>Tua semana</SectionTitle>
          <ul className="flex flex-col gap-2.5 text-sm leading-relaxed text-neutral-200">
            {overdue.map((g) => (
              <li key={g._id} className="flex gap-2.5">
                <Badge tone="bad">cobrar</Badge>
                <span><b>{g.title}</b> foi em {dataCurta(g.date)} e os {brl(g.fee ?? 0)} ainda não entraram.</span>
              </li>
            ))}
            {(expiring ?? []).map((d) => {
              const rule = ruleFor(`${d.name} ${(d as any).kind ?? ""}`);
              return (
                <li key={d._id} className="flex gap-2.5">
                  <Badge tone="warn">documento</Badge>
                  <span>
                    <b>{d.name}</b> vence em {dataCurta(d.expiresAt)}.{rule ? ` ${rule.hint}` : ""}{" "}
                    {rule?.emitUrl ? (
                      <a href={rule.emitUrl} target="_blank" rel="noreferrer" className="text-emerald-300 underline underline-offset-2">Emitir nova</a>
                    ) : (
                      <Link href="/documentos" className="text-emerald-300 underline underline-offset-2">Abrir documentos</Link>
                    )}
                  </span>
                </li>
              );
            })}
            {weekGigs.map((g) => (
              <li key={g._id} className="flex gap-2.5">
                <Badge tone="info">{dataCurta(g.date)}</Badge>
                <span><b>{g.title}</b>{g.venue ? ` em ${g.venue}` : ""}{g.fee ? `, ${brl(g.fee)}` : ""}.</span>
              </li>
            ))}
            {staleLeads.slice(0, 3).map((l) => (
              <li key={l._id} className="flex gap-2.5">
                <Badge>retomar</Badge>
                <span><b>{l.name}</b> está sem resposta há {Math.floor((Date.now() - l.updatedAt) / 86400000)} dias. <Link href="/prospeccao" className="text-emerald-300 underline underline-offset-2">Fazer follow-up</Link></span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card as="section" className="mb-8">
        <SectionTitle>Marcar trabalho</SectionTitle>
        <form
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr_0.9fr]"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.title.trim() || !form.date) return;
            await add({
              profileId: profile._id as any,
              title: form.title.trim(),
              venue: form.venue || undefined,
              date: form.date,
              fee: form.fee ? Number(form.fee.replace(/\./g, "").replace(",", ".")) : undefined,
            });
            setForm({ title: "", venue: "", date: "", fee: "" });
          }}
        >
          <Field label="O que é">
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Show, aula, gravação" />
          </Field>
          <Field label="Onde ou pra quem">
            <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Bar do Zé" />
          </Field>
          <Field label="Data">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Cachê (R$)">
            <Input inputMode="decimal" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value.replace(/[^\d.,]/g, "") })} placeholder="1.500" />
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={!form.title.trim() || !form.date}>Marcar na agenda</Button>
            <Button type="button" variant="ghost" onClick={() => setShowCalc(!showCalc)} aria-expanded={showCalc}>
              {showCalc ? "Fechar calculadora" : "Não sei quanto cobrar"}
            </Button>
          </div>
        </form>

        {showCalc && (
          <div className="mt-5 border-t border-neutral-800 pt-5">
            <p className="mb-3 text-sm text-neutral-400">Soma teus custos e a gente te dá o piso. Abaixo dele você paga pra tocar.</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ["Músicos", "musicians"], ["R$ por músico", "pay"], ["Km total", "km"],
                ["Som e técnico", "tech"], ["Hospedagem", "lodge"], ["Outros", "extra"],
              ].map(([label, key]) => (
                <Field key={key} label={label}>
                  <Input inputMode="numeric" value={calc[key as keyof typeof calc]} onChange={(e) => setCalc({ ...calc, [key]: e.target.value.replace(/[^\d.]/g, "") })} />
                </Field>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <div>
                <p className="text-xs text-neutral-500">Piso (teu custo)</p>
                <p className="font-display text-3xl text-red-300">{brl(cachet.floor)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Pede isso</p>
                <p className="font-display text-3xl text-emerald-300">{brl(cachet.suggested)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Teto da faixa</p>
                <p className="font-display text-3xl text-neutral-300">{brl(cachet.ceiling)}</p>
              </div>
              <p className="pb-1 text-xs text-neutral-500">cerca de {brl(cachet.perMusician)} por músico</p>
              <Button type="button" size="sm" variant="secondary" className="ml-auto" onClick={() => setForm({ ...form, fee: String(cachet.suggested) })}>
                Usar {brl(cachet.suggested)}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {gigs === undefined ? (
        <div className="flex flex-col gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
      ) : sorted.length === 0 ? (
        <EmptyState icon="🎤" title="Nada na agenda ainda" action={<LinkButton href="/prospeccao" variant="secondary">Caçar quem contrata</LinkButton>}>
          Marca teu próximo trabalho no formulário acima, ou fecha um lead na prospecção que ele vem pra cá sozinho.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          {upcoming.length > 0 && (
            <section>
              <SectionTitle>Próximos</SectionTitle>
              <ul className="flex flex-col gap-3">{upcoming.map(gigRow)}</ul>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <SectionTitle>Já passou</SectionTitle>
              <ul className="flex flex-col gap-3">{past.map(gigRow)}</ul>
            </section>
          )}
        </div>
      )}

      {roteiro && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="roteiro-titulo"
          onKeyDown={(e) => e.key === "Escape" && setRoteiro(null)}
          onClick={(e) => e.target === e.currentTarget && setRoteiro(null)}
        >
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-neutral-700 bg-neutral-950 p-5 sm:rounded-3xl sm:p-6">
            <h3 id="roteiro-titulo" className="text-xl font-semibold text-neutral-50">Roteiro musical do ECAD</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">
              {roteiro.gig.title}, {dataCurta(roteiro.gig.date, true)}. Sem o roteiro, o direito autoral do show vai pro rateio geral e paga outros autores.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Field label="Promotor" hint="Quem licencia o evento no ECAD (a casa ou o produtor).">
                <Input autoFocus value={roteiro.promotor} onChange={(e) => setRoteiro({ ...roteiro, promotor: e.target.value })} />
              </Field>
              <Field label="CNPJ ou CPF do promotor" hint="Opcional.">
                <Input value={roteiro.cnpj} onChange={(e) => setRoteiro({ ...roteiro, cnpj: e.target.value })} />
              </Field>
              <Field label="Setlist" hint="Uma música por linha, no formato: Nome da música - Autores. Até 31 músicas.">
                <Textarea className="h-40 font-mono" placeholder={"Evidências - José Augusto / Paulo Valle\nMinha autoral - Teu nome"} value={roteiro.setlist} onChange={(e) => setRoteiro({ ...roteiro, setlist: e.target.value })} />
              </Field>
            </div>
            <div className="mt-5 flex gap-2">
              <Button className="flex-1" size="lg" onClick={gerarRoteiro} loading={roteiro.busy} disabled={!roteiro.setlist.trim()}>
                Baixar planilha
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setRoteiro(null)}>Fechar</Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
