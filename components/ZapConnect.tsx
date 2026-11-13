"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthEmail } from "@/lib/useAuth";
import { Button, Notice } from "@/components/ui";

/** Conectar o WhatsApp do artista por QR code: as mensagens pros integrantes saem do número dele. */
export function ZapConnect() {
  const { token } = useAuthEmail();
  const c = useQuery(api.zap.myConnection, token ? { token } : "skip") as
    | { status: string; qr?: string; phone?: string }
    | null
    | undefined;
  const connect = useMutation(api.zap.connect);
  const disconnect = useMutation(api.zap.disconnect);
  const [confirm, setConfirm] = useState(false);
  if (!c) return null;

  const fmt = (p?: string) => (p ? p.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3") : "");

  return (
    <section className="mb-6 rounded-2xl border border-neutral-800 p-5">
      {c.status === "conectado" ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden />
          <p className="flex-1 text-sm text-neutral-200">
            Teu WhatsApp {fmt(c.phone)} está conectado. O Manager pede os dados e manda os links de assinatura por ele.
          </p>
          {confirm ? (
            <>
              <Button size="sm" variant="danger" onClick={() => { void disconnect({ token }); setConfirm(false); }}>Desconectar</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Não</Button>
            </>
          ) : (
            <button className="text-xs text-neutral-500 underline hover:text-neutral-200" onClick={() => setConfirm(true)}>Desconectar</button>
          )}
        </div>
      ) : c.status === "qr" && c.qr ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.qr} alt="QR code pra conectar o WhatsApp" className="h-56 w-56 rounded-xl bg-white p-2" />
          <div className="text-sm text-neutral-300">
            <p className="font-semibold text-neutral-50">Escaneia com o teu WhatsApp</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-400">
              <li>Abre o WhatsApp no celular</li>
              <li>Toca em ⋮ ou Configurações › Aparelhos conectados</li>
              <li>Conectar um aparelho e aponta pra este código</li>
            </ol>
            <p className="mt-3 text-xs text-neutral-500">O código se renova sozinho. Teu celular continua funcionando normal.</p>
          </div>
        </div>
      ) : c.status === "pedindo_qr" ? (
        <p className="text-sm text-neutral-300" role="status">Gerando o QR code… leva uns segundos.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-neutral-300">
            <b className="text-neutral-50">Conecta teu WhatsApp</b> e o Manager pede os dados de cada integrante, confere com a pessoa, preenche o documento e manda o link pra assinar na vez de cada um. Tudo saindo do teu número.
          </p>
          <Button onClick={() => void connect({ token })}>Conectar WhatsApp</Button>
        </div>
      )}
      {c.status === "desconectado" && <div className="mt-3"><Notice tone="warn">O WhatsApp desconectou. Conecta de novo pra continuar os pedidos.</Notice></div>}
    </section>
  );
}

const STATE: Record<string, string> = {
  pedindo: "pedindo dados",
  conferindo: "conferindo dados",
  confirmado: "dados ok, espera a vez",
  link_enviado: "link enviado",
  assinado: "assinou",
};

/** Em cada documento: pedir os dados pelo zap e ver em que pé está cada conversa. */
export function IntakeButton({ docId, pending }: { docId: string; pending: boolean }) {
  const { token } = useAuthEmail();
  const conn = useQuery(api.zap.myConnection, token ? { token } : "skip") as { status: string } | null | undefined;
  const threads = useQuery(api.zap.threadsForDoc, token ? { token, docId: docId as never } : "skip") as { order: number; state: string }[] | undefined;
  const start = useMutation(api.zap.startIntake);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!pending && !threads?.length) return null;

  return (
    <div className="mt-3 text-xs">
      {threads?.length ? (
        <p className="text-neutral-400">
          No zap: {threads.sort((a, b) => a.order - b.order).map((t) => `${t.order}º ${STATE[t.state] ?? t.state}`).join(" · ")}
        </p>
      ) : conn?.status === "conectado" ? (
        <Button size="sm" variant="secondary" loading={busy} onClick={async () => {
          setBusy(true);
          try {
            const r = (await start({ token, docId: docId as never })) as { ok: boolean; sent?: number; semFone?: string[] };
            setMsg(r.ok ? `Pedi os dados pra ${r.sent} pessoa(s) no teu WhatsApp.${r.semFone?.length ? ` Sem número: ${r.semFone.join(", ")}.` : ""}` : "Conecta teu WhatsApp aí em cima primeiro.");
          } finally { setBusy(false); }
        }}>
          Pedir dados no zap
        </Button>
      ) : (
        <p className="text-neutral-500">Conecta teu WhatsApp aí em cima e o Manager pede os dados de cada um por lá.</p>
      )}
      {msg && <p className="mt-1.5 text-emerald-300">{msg}</p>}
    </div>
  );
}
