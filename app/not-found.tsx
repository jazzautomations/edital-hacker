import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-xl flex-col items-start justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">Erro 404</p>
      <h1 className="mt-3 text-5xl text-neutral-50 sm:text-6xl">Essa página não está no roteiro.</h1>
      <p className="mt-4 text-neutral-400">O endereço pode ter mudado ou o edital já saiu do ar.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/oportunidades" className="rounded-full bg-emerald-400 px-5 py-2.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300">
          Ver editais abertos
        </Link>
        <Link href="/" className="rounded-full border border-neutral-700 px-5 py-2.5 text-sm font-medium text-neutral-100 hover:border-neutral-500">
          Voltar pro início
        </Link>
      </div>
    </main>
  );
}
