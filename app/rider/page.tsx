"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { useState } from "react";
import { useAuthEmail } from "@/lib/useAuth";

// Rider técnico versionado — o artista mantém trio/banda/solo prontos
// e manda PDF pro técnico de som antes de qualquer negociação fechar.
type Member = { position: string; instrument: string; vocals?: boolean };
type Input = { channel: number; source: string; mic: string };
type Rider = {
  _id?: string; name: string; techContact?: string;
  members: Member[]; inputs: Input[];
  monitors?: string; backlineOwn?: string; backlineVenue?: string;
  hospitality?: string; notes?: string;
};

const EMPTY: Rider = {
  name: "", members: [{ position: "centro-frente", instrument: "voz", vocals: true }],
  inputs: [{ channel: 1, source: "voz", mic: "SM58" }],
};

export default function RiderPage() {
  const { email, setEmail, locked, authEnabled } = useAuthEmail();
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as any;
  const riders = useQuery(
    api.riders.listForProfile,
    profile ? { profileId: profile._id } : "skip"
  ) as Rider[] | undefined;
  const upsert = useMutation(api.riders.upsert);
  const remove = useMutation(api.riders.remove);

  const [form, setForm] = useState<Rider>(EMPTY);
  const [busy, setBusy] = useState(false);

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">Rider técnico</h1>
        {authEnabled && !locked && (
            <a href="/login" className="rounded-xl bg-sky-500 px-4 py-3 text-center font-semibold text-black">
              Entrar com WorkOS &rarr;
            </a>
          )}
        <form className="flex flex-col gap-3"
          onSubmit={(e) => { e.preventDefault(); localStorage.setItem("manager_email", email); setEmail(email); }}>
          <input className="rounded-xl bg-neutral-900 px-4 py-3" placeholder="seu@email.com" type="email"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black">Entrar</button>
        </form>
      </main>
    );
  }

  const setMember = (i: number, patch: Partial<Member>) =>
    setForm({ ...form, members: form.members.map((m, n) => (n === i ? { ...m, ...patch } : m)) });
  const setInput = (i: number, patch: Partial<Input>) =>
    setForm({ ...form, inputs: form.inputs.map((m, n) => (n === i ? { ...m, ...patch } : m)) });

  const gen = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/rider", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: { name: profile.name, city: profile.city, phone: profile.phone },
          rider: form,
        }),
      });
      if (res.ok) window.open(URL.createObjectURL(await res.blob()), "_blank");
    } finally { setBusy(false); }
  };

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <Link href="/" className="font-mono text-xs text-emerald-400">manager_</Link>
          <h1 className="text-3xl font-bold">Rider técnico</h1>
          <p className="mt-1 text-sm text-neutral-400">
            O documento que separa amador de profissional — mapa de palco, input list e camarim em PDF.
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link href="/agenda" className="text-emerald-400 hover:underline">Agenda →</Link>
          <Link href="/coach" className="text-amber-400 hover:underline">Coach →</Link>
        </div>
      </header>

      {(riders?.length ?? 0) > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {riders!.map((r) => (
            <button key={r._id}
              onClick={() => setForm({ ...EMPTY, ...r })}
              className={`rounded-lg border px-3 py-1.5 text-xs ${form._id === r._id ? "border-emerald-500 text-emerald-400" : "border-neutral-800 text-neutral-400"}`}>
              {r.name} ({r.members.length})
            </button>
          ))}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <input className="rounded-xl bg-neutral-900 px-4 py-3" placeholder="nome da formação (trio, banda cheia)"
          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="rounded-xl bg-neutral-900 px-4 py-3" placeholder="contato técnico (nome + fone)"
          value={form.techContact ?? ""} onChange={(e) => setForm({ ...form, techContact: e.target.value })} />
      </div>

      <section className="mb-4 rounded-2xl border border-neutral-800 p-4">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-400">Formação (palco visto de cima)</h2>
        {form.members.map((m, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input className="w-32 rounded-lg bg-neutral-900 px-3 py-2 text-xs" placeholder="posição"
              value={m.position} onChange={(e) => setMember(i, { position: e.target.value })} />
            <input className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs" placeholder="instrumento/função"
              value={m.instrument} onChange={(e) => setMember(i, { instrument: e.target.value })} />
            <label className="flex items-center gap-1 text-xs text-neutral-400">
              <input type="checkbox" checked={!!m.vocals} onChange={(e) => setMember(i, { vocals: e.target.checked })} /> voz
            </label>
            <button onClick={() => setForm({ ...form, members: form.members.filter((_, n) => n !== i) })}
              className="text-xs text-neutral-600 hover:text-red-400">✕</button>
          </div>
        ))}
        <button onClick={() => setForm({ ...form, members: [...form.members, { position: "", instrument: "" }] })}
          className="text-xs text-emerald-400 hover:underline">+ músico</button>
      </section>

      <section className="mb-4 rounded-2xl border border-neutral-800 p-4">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-neutral-400">Input list</h2>
        {form.inputs.map((m, i) => (
          <div key={i} className="mb-2 flex gap-2">
            <input className="w-14 rounded-lg bg-neutral-900 px-3 py-2 text-xs" placeholder="ch"
              inputMode="numeric" value={m.channel}
              onChange={(e) => setInput(i, { channel: Number(e.target.value.replace(/\D/g, "")) || 0 })} />
            <input className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs" placeholder="fonte (bumbo, baixo DI, voz)"
              value={m.source} onChange={(e) => setInput(i, { source: e.target.value })} />
            <input className="flex-1 rounded-lg bg-neutral-900 px-3 py-2 text-xs" placeholder="mic/DI (SM57, DI ativo)"
              value={m.mic} onChange={(e) => setInput(i, { mic: e.target.value })} />
            <button onClick={() => setForm({ ...form, inputs: form.inputs.filter((_, n) => n !== i) })}
              className="text-xs text-neutral-600 hover:text-red-400">✕</button>
          </div>
        ))}
        <button onClick={() => setForm({ ...form, inputs: [...form.inputs, { channel: form.inputs.length + 1, source: "", mic: "" }] })}
          className="text-xs text-emerald-400 hover:underline">+ canal</button>
      </section>

      {(["monitors", "backlineOwn", "backlineVenue", "hospitality", "notes"] as const).map((k) => (
        <label key={k} className="mb-3 flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase text-neutral-500">
            {{ monitors: "monitoração", backlineOwn: "backline — banda leva", backlineVenue: "backline — casa fornece", hospitality: "camarim e hospitalidade", notes: "observações" }[k]}
          </span>
          <textarea className="rounded-xl bg-neutral-900 px-4 py-3 text-sm" rows={2}
            value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
        </label>
      ))}

      <div className="flex gap-3">
        <button disabled={!form.name || !form.members.length || busy}
          onClick={async () => {
            const id = await upsert({ ...(form._id ? { id: form._id as any } : {}), profileId: profile._id, ...form });
            setForm({ ...form, _id: id });
          }}
          className="flex-1 rounded-xl bg-neutral-800 px-4 py-3 text-sm disabled:opacity-40">
          salvar formação
        </button>
        <button disabled={!form.name || !form.members.length || busy} onClick={gen}
          className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-black disabled:opacity-40">
          {busy ? "gerando…" : "📄 gerar PDF do rider"}
        </button>
        {form._id && (
          <button onClick={async () => { await remove({ id: form._id as any }); setForm(EMPTY); }}
            className="rounded-xl px-4 py-3 text-xs text-neutral-600 hover:text-red-400">rm</button>
        )}
      </div>
    </main>
  );
}
