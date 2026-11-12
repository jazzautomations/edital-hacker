"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/oportunidades", label: "Radar" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/agenda", label: "Agenda" },
  { href: "/prospeccao", label: "Prospecção" },
  { href: "/coach", label: "Coach" },
  { href: "/rider", label: "Rider" },
  { href: "/prestacao", label: "Prestação" },
];

export function AppNav() {
  const path = usePathname() ?? "/";
  if (path.startsWith("/epk")) return null; // página pública do press kit
  const isActive = (href: string) =>
    path === href || path.startsWith(href + "/") || (href === "/oportunidades" && path.startsWith("/sabatina"));

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/70 bg-neutral-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-baseline gap-1.5" aria-label="Manager — início">
          <span className="font-display text-2xl leading-none text-neutral-50">Manager</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        </Link>

        <nav className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-1">
          {LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
                  active
                    ? "bg-neutral-800 text-neutral-50"
                    : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-100"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/assinatura"
          className="hidden shrink-0 rounded-full bg-emerald-400 px-4 py-1.5 text-sm font-semibold text-neutral-950 hover:bg-emerald-300 sm:inline-block"
        >
          Assinar
        </Link>
      </div>
    </header>
  );
}
