"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuthEmail } from "@/lib/useAuth";

const APP_LINKS = [
  { href: "/inicio", label: "Início" },
  { href: "/oportunidades", label: "Radar" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/agenda", label: "Agenda" },
  { href: "/prospeccao", label: "Prospecção" },
  { href: "/documentos", label: "Documentos" },
  { href: "/coach", label: "Coach" },
];
const MORE_LINKS = [
  { href: "/rider", label: "Rider técnico" },
  { href: "/prestacao", label: "Prestação de contas" },
  { href: "/assinatura", label: "Planos" },
];
const PUBLIC_LINKS = [
  { href: "/oportunidades", label: "Radar de editais" },
  { href: "/assinatura", label: "Planos" },
];

export function AppNav() {
  const path = usePathname() ?? "/";
  const { email, ready } = useAuthEmail();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const logged = ready && /^\S+@\S+\.\S+$/.test(email);

  useEffect(() => setMenu(false), [path]);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  if (path.startsWith("/epk")) return null; // página pública do press kit
  const onboarding = path.startsWith("/comecar");

  const isActive = (href: string) =>
    path === href || path.startsWith(href + "/") || (href === "/oportunidades" && path.startsWith("/sabatina"));
  const links = logged ? APP_LINKS : PUBLIC_LINKS;

  function sair() {
    try {
      localStorage.removeItem("manager_email");
    } catch {}
    window.location.href = "/sair";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/70 bg-neutral-950/85 backdrop-blur-md">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-emerald-400 focus:px-4 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-neutral-950">
        Pular pro conteúdo
      </a>
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href={logged ? "/inicio" : "/"} className="flex shrink-0 items-baseline gap-1.5" aria-label="Manager, página inicial">
          <span className="font-display text-2xl leading-none text-neutral-50">Manager</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        </Link>

        {onboarding ? (
          <span className="flex-1" />
        ) : (
          <nav aria-label="Principal" className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1">
            {links.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  ref={active ? (el) => el?.scrollIntoView({ block: "nearest", inline: "center" }) : undefined}
                  className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                    active ? "bg-neutral-800 text-neutral-50" : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        )}

        {!ready ? (
          <span className="h-8 w-20" />
        ) : logged ? (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => setMenu((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menu}
              aria-label="Menu da conta"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-700 text-sm font-semibold uppercase text-neutral-100 hover:border-neutral-500"
            >
              {email[0]}
            </button>
            {menu && (
              <div role="menu" className="absolute right-0 top-11 w-60 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 p-1.5 shadow-2xl shadow-black/50">
                <p className="truncate px-3 py-2 text-xs text-neutral-500">{email}</p>
                {MORE_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} role="menuitem" className="block rounded-xl px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800">
                    {l.label}
                  </Link>
                ))}
                <button onClick={sair} role="menuitem" className="block w-full rounded-xl px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800">
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          !onboarding && (
            <div className="flex shrink-0 items-center gap-1">
              <Link href="/inicio" className="hidden rounded-full px-3 py-1.5 text-sm text-neutral-300 hover:text-neutral-50 sm:inline-block">
                Entrar
              </Link>
              <Link href="/comecar" className="rounded-full bg-emerald-400 px-4 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300">
                Começar grátis
              </Link>
            </div>
          )
        )}
      </div>
    </header>
  );
}
