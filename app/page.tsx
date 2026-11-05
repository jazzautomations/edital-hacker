import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-20">
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">
          manager_
        </p>
        <h1 className="text-4xl font-bold leading-tight md:text-6xl">
          O empresário de IA que o artista independente não tem.
        </h1>
        <p className="max-w-xl text-lg text-neutral-400">
          Ele encontra os editais, prêmios e gigs que aceitam você, sabatina sua
          proposta como uma banca real e segura sua burocracia — por menos que a
          comissão de um show.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/oportunidades"
          className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black transition hover:bg-emerald-400"
        >
          Ver oportunidades abertas →
        </Link>
        <Link
          href="/pipeline"
          className="rounded-xl border border-neutral-700 px-6 py-3 font-semibold transition hover:border-neutral-500"
        >
          Meu pipeline
        </Link>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
        {[
          ["R$ 2,4 bi/ano", "em fomento público parado atrás de burocracia"],
          ["15–20%", "é o que um booker humano cobra por show"],
          ["45+ fontes", "instâncias Mapas Culturais + sites municipais"],
        ].map(([num, label]) => (
          <div
            key={num}
            className="rounded-2xl border border-neutral-800 p-5 text-center"
          >
            <p className="text-2xl font-bold text-emerald-400">{num}</p>
            <p className="mt-1 text-sm text-neutral-400">{label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
