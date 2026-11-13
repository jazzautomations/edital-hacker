"use client";

import { use, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button, Field, Input, Notice, Skeleton } from "@/components/ui";

export default function SignClient({ params }: { params: Promise<{ link: string }> }) {
  const { link } = use(params);
  const d = useQuery(api.signDocs.forSigner, { link });
  const sign = useMutation(api.signDocs.sign);
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [address, setAddress] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [drawn, setDrawn] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  // traço com dedo ou mouse
  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    let down = false;
    const pos = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    const start = (e: PointerEvent) => { down = true; c.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const move = (e: PointerEvent) => { if (!down) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); setDrawn(true); };
    const end = () => { down = false; };
    c.addEventListener("pointerdown", start);
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerup", end);
    c.addEventListener("pointercancel", end);
    return () => {
      c.removeEventListener("pointerdown", start);
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerup", end);
      c.removeEventListener("pointercancel", end);
    };
  }, [d?.me.status]);

  const clear = () => {
    const c = canvas.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    setDrawn(false);
  };

  if (d === undefined) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-6 h-64" />
      </main>
    );
  }
  if (d === null) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-16">
        <h1 className="text-3xl text-neutral-50">Link não encontrado</h1>
        <p className="mt-3 text-neutral-400">Esse link de assinatura não existe ou o documento foi apagado. Pede um novo pra quem te mandou.</p>
      </main>
    );
  }

  const signed = d.me.status === "assinado";
  const blocked = !signed && d.waitingFor.length > 0;
  const prazo = d.deadline ? d.deadline.split("-").reverse().join("/") : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (cpf.replace(/\D/g, "").length !== 11) return setErr("CPF precisa ter 11 números.");
    if (!drawn) return setErr("Faz tua assinatura no quadro.");
    if (!agree) return setErr("Confirma que leu o documento.");
    setBusy(true);
    try {
      await sign({ link, cpf, rg: rg || undefined, address: address || undefined, signature: canvas.current!.toDataURL("image/png") });
    } catch (e) {
      setErr(e instanceof Error ? e.message.replace(/^.*Uncaught Error: /, "").split("\n")[0] : "Não deu pra assinar. Tenta de novo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">Assinatura · {d.from}</p>
      <h1 className="mt-3 text-3xl text-neutral-50 sm:text-4xl">{d.title}</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Para {d.me.name}{d.me.role ? ` (${d.me.role})` : ""}{prazo ? ` · assinar até ${prazo}` : ""}
      </p>

      <ol className="mt-5 flex flex-wrap gap-2 text-xs">
        {d.people.map((p) => (
          <li key={p.order} className={`rounded-full border px-3 py-1 ${p.status === "assinado" ? "border-emerald-500/40 text-emerald-300" : "border-neutral-800 text-neutral-400"}`}>
            {d.sequential ? `${p.order}. ` : ""}{p.name} {p.status === "assinado" ? "✓" : ""}
          </li>
        ))}
      </ol>

      <article className="mt-6 max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-2xl border border-neutral-800 bg-neutral-50 p-5 text-sm leading-relaxed text-neutral-900">
        {d.body.replace(/\*\*/g, "")}
      </article>

      {signed ? (
        <div className="mt-6 flex flex-col gap-3">
          <Notice tone="good">Você assinou em {new Date(d.me.signedAt!).toLocaleString("pt-BR")}. Obrigado!</Notice>
          <a href={`/api/assinatura?link=${link}`} target="_blank" className="text-sm font-semibold text-emerald-300 underline">Ver o PDF com as assinaturas</a>
        </div>
      ) : blocked ? (
        <div className="mt-6"><Notice tone="warn">Ainda não é tua vez. Falta {d.waitingFor.join(", ")} assinar antes. Você recebe o aviso quando chegar a tua vez: é só abrir este mesmo link.</Notice></div>
      ) : (
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="CPF"><Input inputMode="numeric" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" required /></Field>
            <Field label="RG (se o edital pedir)"><Input value={rg} onChange={(e) => setRg(e.target.value)} /></Field>
          </div>
          <Field label="Endereço (se o edital pedir)"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, cidade/UF" /></Field>
          <div>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium text-neutral-200">Tua assinatura</span>
              <button type="button" onClick={clear} className="text-xs text-neutral-400 underline">Limpar</button>
            </div>
            <canvas ref={canvas} className="h-40 w-full touch-none rounded-xl border border-neutral-700 bg-white" aria-label="Quadro de assinatura" />
          </div>
          <label className="flex items-start gap-2 text-sm text-neutral-300">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
            Li o documento acima e concordo em assiná-lo eletronicamente.
          </label>
          {err && <Notice tone="bad">{err}</Notice>}
          <Button type="submit" size="lg" loading={busy}>Assinar</Button>
        </form>
      )}
    </main>
  );
}
