"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Profile } from "@/lib/types";
import { useAuthEmail } from "@/lib/useAuth";
import { EmailCodeForm } from "@/components/EmailCodeForm";
import { Skeleton } from "@/components/ui";

/**
 * Porta de entrada única das áreas logadas.
 *  - carregando → esqueleto (sem piscar formulário pra quem já está logado)
 *  - sem sessão → entrar com conta ou com código no e-mail
 *  - sessão sem perfil → manda pro onboarding (/comecar)
 */
export function SignIn({ profile, title, blurb }: { profile: Profile | null | undefined; title: string; blurb?: string }) {
  const router = useRouter();
  const { email, ready } = useAuthEmail();
  const logged = Boolean(email);

  useEffect(() => {
    if (ready && logged && profile === null) {
      const back = window.location.pathname + window.location.search;
      router.replace(`/comecar?voltar=${encodeURIComponent(back)}`);
    }
  }, [ready, logged, profile, router]);

  if (!ready || logged) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6" aria-busy="true" aria-label="Carregando">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="mt-4 h-5 w-96 max-w-full" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">Área do artista</p>
      <h1 className="mt-3 text-4xl text-neutral-50 sm:text-5xl">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-neutral-400">
        {blurb ?? "Entra pra ver tua carreira organizada. Se for tua primeira vez, a gente monta teu perfil em 1 minuto."}
      </p>
      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
        <EmailCodeForm />
      </div>
      <p className="mt-4 text-center text-xs text-neutral-500">Grátis pra começar. Sem senha, sem cartão, sem comissão sobre cachê.</p>
    </main>
  );
}
