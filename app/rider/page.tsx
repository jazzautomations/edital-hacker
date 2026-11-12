"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import { SignIn } from "@/components/SignIn";
import { Button, Card, Field, Input, Notice, Page, PageHeader, SectionTitle, Textarea } from "@/components/ui";

// Rider técnico versionado — o artista mantém trio/banda/solo prontos
// e manda PDF pro técnico de som antes de qualquer negociação fechar.
type Member = { position: string; instrument: string; vocals?: boolean };
type Channel = { channel: number; source: string; mic: string };
type Rider = {
  _id?: string; name: string; techContact?: string;
  members: Member[]; inputs: Channel[];
  monitors?: string; backlineOwn?: string; backlineVenue?: string;
  hospitality?: string; notes?: string;
};

const EMPTY: Rider = {
  name: "", members: [{ position: "centro-frente", instrument: "voz", vocals: true }],
  inputs: [{ channel: 1, source: "voz", mic: "SM58" }],
};

export default function RiderPage() {
  const { email, token, ready } = useAuthEmail();
  const profile = useMyProfile() as any;
  const riders = useQuery(
    api.riders.listForProfile,
    profile ? { profileId: profile._id } : "skip"
  ) as Rider[] | undefined;
  const upsert = useMutation(api.riders.upsert);
  const remove = useMutation(api.riders.remove);

  const [form, setForm] = useState<Rider>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!profile) {
    return (
      <SignIn
        title="Rider técnico"
        blurb="Mapa de palco, input list e camarim num PDF que o produtor respeita."
        profile={profile}
      />
    );
  }

  const setMember = (i: number, patch: Partial<Member>) =>
    setForm({ ...form, members: form.members.map((m, n) => (n === i ? { ...m, ...patch } : m)) });
  const setInput = (i: number, patch: Partial<Channel>) =>
    setForm({ ...form, inputs: form.inputs.map((m, n) => (n === i ? { ...m, ...patch } : m)) });

  const gen = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { name: profile.name, city: profile.city, phone: profile.phone },
          rider: payload(),
        }),
      });
      if (!res.ok) throw new Error("pdf");
      window.open(URL.createObjectURL(await res.blob()), "_blank");
    } finally { setBusy(false); }
  };

  // só os campos do rider vão pro servidor (o registro carregado traz _id,
  // _creationTime etc. — mandar tudo fazia o salvar de um rider existente falhar)
  const payload = () => ({
    name: form.name.trim(),
    techContact: form.techContact || undefined,
    members: form.members.filter((m) => m.instrument.trim()).map((m) => ({ position: m.position, instrument: m.instrument, vocals: m.vocals })),
    inputs: form.inputs.filter((i) => i.source.trim()).map((i) => ({ channel: i.channel, source: i.source, mic: i.mic })),
    monitors: form.monitors || undefined,
    backlineOwn: form.backlineOwn || undefined,
    backlineVenue: form.backlineVenue || undefined,
    hospitality: form.hospitality || undefined,
    notes: form.notes || undefined,
  });
  const ok = form.name.trim() && form.members.some((m) => m.instrument.trim());

  const LONG: { k: "monitors" | "backlineOwn" | "backlineVenue" | "hospitality" | "notes"; label: string; ph: string }[] = [
    { k: "monitors", label: "Monitoração", ph: "Ex.: 3 vias de monitor, voz na 1 com reverb" },
    { k: "backlineOwn", label: "O que a banda leva", ph: "Ex.: instrumentos, pedais, cabos" },
    { k: "backlineVenue", label: "O que a casa precisa fornecer", ph: "Ex.: bateria completa, amplificador de baixo, 4 pedestais" },
    { k: "hospitality", label: "Camarim e hospitalidade", ph: "Ex.: água, 4 refeições, camarim com espelho" },
    { k: "notes", label: "Observações", ph: "Tudo que o técnico da casa precisa saber" },
  ];

  return (
    <Page width="max-w-3xl">
      <PageHeader
        title="Rider técnico"
        description="Mapa de palco, lista de canais e camarim num PDF de uma página. É o documento que o produtor pede antes de fechar."
      />

      {(riders?.length ?? 0) > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">Tuas formações:</span>
          {riders!.map((r) => (
            <button
              key={r._id}
              onClick={() => { setForm({ ...EMPTY, ...r }); setSaved(false); }}
              aria-pressed={form._id === r._id}
              className={`rounded-full border px-3.5 py-1.5 text-sm ${form._id === r._id ? "border-emerald-400 bg-emerald-400 font-semibold text-neutral-950" : "border-neutral-700 text-neutral-300 hover:border-neutral-500"}`}
            >
              {r.name}
            </button>
          ))}
          <button onClick={() => { setForm(EMPTY); setSaved(false); }} className="rounded-full px-3 py-1.5 text-sm text-emerald-300 hover:underline">
            Nova formação
          </button>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <Card as="section">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da formação" hint="Ex.: trio acústico, banda completa.">
              <Input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setSaved(false); }} />
            </Field>
            <Field label="Contato técnico" hint="Nome e telefone de quem responde pelo som.">
              <Input value={form.techContact ?? ""} onChange={(e) => setForm({ ...form, techContact: e.target.value })} />
            </Field>
          </div>
        </Card>

        <Card as="section">
          <SectionTitle>Quem está no palco</SectionTitle>
          <p className="mb-4 text-sm text-neutral-400">Posição vista da plateia: “centro-frente”, “esquerda-fundo”. Vira o mapa de palco do PDF.</p>
          <ul className="flex flex-col gap-3">
            {form.members.map((m, i) => (
              <li key={i} className="grid grid-cols-[1fr_1.3fr] items-end gap-2 sm:grid-cols-[10rem_1fr_auto_auto]">
                <Field label={i === 0 ? "Posição" : "Posição"} className={i > 0 ? "[&>span:first-child]:sr-only" : ""}>
                  <Input value={m.position} onChange={(e) => setMember(i, { position: e.target.value })} placeholder="centro-frente" />
                </Field>
                <Field label="Instrumento ou função" className={i > 0 ? "[&>span:first-child]:sr-only" : ""}>
                  <Input value={m.instrument} onChange={(e) => setMember(i, { instrument: e.target.value })} placeholder="violão" />
                </Field>
                <label className="flex h-11 items-center gap-2 text-sm text-neutral-300">
                  <input type="checkbox" className="h-4 w-4" checked={!!m.vocals} onChange={(e) => setMember(i, { vocals: e.target.checked })} />
                  canta
                </label>
                <Button type="button" variant="ghost" size="sm" className="mb-1.5 justify-self-end" aria-label={`Remover ${m.instrument || "músico"}`} onClick={() => setForm({ ...form, members: form.members.filter((_, n) => n !== i) })}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setForm({ ...form, members: [...form.members, { position: "", instrument: "" }] })}>
            Adicionar músico
          </Button>
        </Card>

        <Card as="section">
          <SectionTitle>Lista de canais</SectionTitle>
          <p className="mb-4 text-sm text-neutral-400">Um canal por fonte de som. O técnico da casa monta a mesa por esta lista.</p>
          <ul className="flex flex-col gap-3">
            {form.inputs.map((m, i) => (
              <li key={i} className="grid grid-cols-[3.5rem_1fr] items-end gap-2 sm:grid-cols-[4rem_1fr_1fr_auto]">
                <Field label="Canal" className={i > 0 ? "[&>span:first-child]:sr-only" : ""}>
                  <Input inputMode="numeric" value={m.channel} onChange={(e) => setInput(i, { channel: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
                </Field>
                <Field label="O que entra" className={i > 0 ? "[&>span:first-child]:sr-only" : ""}>
                  <Input value={m.source} onChange={(e) => setInput(i, { source: e.target.value })} placeholder="voz, bumbo, baixo" />
                </Field>
                <Field label="Microfone ou DI" className={`col-span-2 sm:col-span-1 ${i > 0 ? "[&>span:first-child]:sr-only" : ""}`}>
                  <Input value={m.mic} onChange={(e) => setInput(i, { mic: e.target.value })} placeholder="SM58, DI ativo" />
                </Field>
                <Button type="button" variant="ghost" size="sm" className="col-span-2 mb-1.5 justify-self-end sm:col-span-1" aria-label={`Remover canal ${m.channel}`} onClick={() => setForm({ ...form, inputs: form.inputs.filter((_, n) => n !== i) })}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
          <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={() => setForm({ ...form, inputs: [...form.inputs, { channel: form.inputs.length + 1, source: "", mic: "" }] })}>
            Adicionar canal
          </Button>
        </Card>

        <Card as="section">
          <SectionTitle>Estrutura e camarim</SectionTitle>
          <div className="flex flex-col gap-4">
            {LONG.map(({ k, label, ph }) => (
              <Field key={k} label={label}>
                <Textarea rows={2} className="!min-h-16" placeholder={ph} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
        </Card>
      </div>

      {err && <div className="mt-5"><Notice tone="bad">{err}</Notice></div>}

      <div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap items-center gap-2 border-t border-neutral-800/70 bg-neutral-950/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <Button size="lg" disabled={!ok} loading={busy} onClick={async () => { setErr(null); try { await gen(); } catch { setErr("Não deu pra gerar o PDF agora. Tenta de novo."); } }}>
          Gerar PDF
        </Button>
        <Button
          size="lg"
          variant="secondary"
          disabled={!ok || busy}
          onClick={async () => {
            setErr(null);
            try {
              const id = await upsert({ ...(form._id ? { id: form._id as any } : {}), profileId: profile._id, ...payload() });
              setForm({ ...form, _id: id as any });
              setSaved(true);
            } catch {
              setErr("Não consegui salvar a formação. Confere a conexão e tenta de novo.");
            }
          }}
        >
          {saved ? "Formação salva" : "Salvar formação"}
        </Button>
        {!ok && <span className="text-sm text-neutral-500">Dá um nome e pelo menos um instrumento.</span>}
        {form._id && (
          <Button variant="ghost" className="ml-auto" onClick={async () => { await remove({ id: form._id as any }); setForm(EMPTY); setSaved(false); }}>
            Apagar formação
          </Button>
        )}
      </div>
    </Page>
  );
}
