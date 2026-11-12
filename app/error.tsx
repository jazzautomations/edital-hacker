"use client";

import { useEffect } from "react";

// Tela de erro do app. Sem ela, qualquer falha virava o "This page couldn't
// load" em inglês do framework, sem saída.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-xl flex-col items-start justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-400">Algo travou</p>
      <h1 className="mt-3 text-5xl text-neutral-50 sm:text-6xl">Essa tela não carregou.</h1>
      <p className="mt-4 text-neutral-400">
        Teus dados estão salvos. Tenta de novo; se continuar, recarrega a página.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button onClick={() => reset()} className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300">
          Tentar de novo
        </button>
        <a href="/inicio" className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-100 hover:border-neutral-500">
          Ir pro painel
        </a>
      </div>
      {error.digest && <p className="mt-8 font-mono text-xs text-neutral-600">código {error.digest}</p>}
    </main>
  );
}
