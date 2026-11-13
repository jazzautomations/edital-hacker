"use client";

import { useEffect, useRef, useState } from "react";
import { RichText } from "@/lib/format";
import { LinkButton } from "@/components/ui";

/**
 * Logo depois do cadastro: o Manager estuda os links do artista (em segundo
 * plano) e o coach chega com um diagnóstico de verdade, não com "como posso ajudar?".
 */
export function WelcomeCoach({ token, studied }: { token: string; studied: boolean }) {
  const [reply, setReply] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [waited, setWaited] = useState(false);
  const asked = useRef(false);

  // espera a pesquisa terminar, mas no máximo 60s
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 60_000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (asked.current || !(studied || waited)) return;
    asked.current = true;
    fetch("/api/coach/boas-vindas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then((r) => r.json())
      .then((d) => (d.reply ? setReply(d.reply) : d.existing ? setReply("") : setFailed(true)))
      .catch(() => setFailed(true));
  }, [studied, waited, token]);

  if (reply === "") return null; // conversa já tinha começado

  return (
    <section className="mb-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 sm:p-6" aria-live="polite">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">Teu Manager</p>
      {reply ? (
        <>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-neutral-200 sm:text-base">
            <RichText text={reply} />
          </div>
          <LinkButton href="/coach" className="mt-5">Continuar no coach</LinkButton>
        </>
      ) : failed ? (
        <p className="mt-3 text-sm text-neutral-300">Teu perfil está pronto. Abre o coach e pergunta &quot;por onde eu começo?&quot;.</p>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-sm text-neutral-300" role="status">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          {studied ? "Cruzando o que achei com o radar e teus documentos…" : "Lendo teus links e pesquisando teu nome na web pra montar teu diagnóstico…"}
        </div>
      )}
    </section>
  );
}
