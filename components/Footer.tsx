"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Rodapé só nas páginas públicas; dentro do app ele só roubaria espaço.
const PUBLIC = ["/", "/oportunidades", "/assinatura", "/privacidade", "/termos"];

export function Footer() {
  const path = usePathname() ?? "/";
  if (!PUBLIC.includes(path) && !path.startsWith("/sabatina")) return null;
  return (
    <footer className="mt-auto border-t border-neutral-800/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-start sm:justify-between sm:px-6">
        <div className="max-w-sm">
          <p className="flex items-baseline gap-1.5">
            <span className="font-display text-2xl leading-none text-neutral-50">Manager</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          </p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Você cuida da arte. O Manager cuida da renda. Feito no Brasil pra quem vive de cultura.
          </p>
        </div>
        <nav aria-label="Rodapé" className="grid grid-cols-2 gap-x-12 gap-y-2 text-sm text-neutral-400">
          <Link href="/oportunidades" className="hover:text-neutral-100">Radar de editais</Link>
          <Link href="/assinatura" className="hover:text-neutral-100">Planos</Link>
          <Link href="/comecar" className="hover:text-neutral-100">Criar perfil</Link>
          <Link href="/inicio" className="hover:text-neutral-100">Entrar</Link>
          <Link href="/privacidade" className="hover:text-neutral-100">Privacidade</Link>
          <Link href="/termos" className="hover:text-neutral-100">Termos de uso</Link>
        </nav>
      </div>
    </footer>
  );
}
