"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/types";
import { Button, Field, Input, LinkButton, Skeleton } from "@/components/ui";

/**
 * Porta de entrada única das áreas logadas. Substitui os 7 formulários de
 * login copiados (um por página, cada um com um comportamento).
 *  - carregando → esqueleto (sem piscar formulário pra quem já está logado)
 *  - sem e-mail → entrar com conta (WorkOS) ou e-mail
 *  - e-mail sem perfil → manda pro onboarding (/comecar)
 */
export function SignIn({
  email,
  setEmail,
  locked,
  authEnabled,
  ready = true,
  profile,
  title,
  blurb,
}: {
  email: string;
  setEmail: (e: string) => void;
  locked: boolean;
  authEnabled: boolean;
  ready?: boolean;
  profile: Profile | null | undefined;
  title: string;
  blurb?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const hasEmail = /^\S+@\S+\.\S+$/.test(email);

  // e-mail conhecido mas sem perfil → onboarding
  useEffect(() => {
    if (ready && hasEmail && profile === null) {
      const back = typeof window !== "undefined" ? window.location.pathname + window.location.search : "/inicio";
      router.replace(`/comecar?voltar=${encodeURIComponent(back)}`);
    }
  }, [ready, hasEmail, profile, router]);

  if (!ready || (hasEmail && profile === undefined) || (hasEmail && profile === null)) {
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
        {authEnabled && !locked && (
          <>
            <LinkButton href="/login" variant="secondary" size="lg" className="w-full !bg-neutral-100 !text-neutral-950 hover:!bg-white">
              Entrar com Google ou conta
            </LinkButton>
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span className="h-px flex-1 bg-neutral-800" />
              ou só com teu e-mail
              <span className="h-px flex-1 bg-neutral-800" />
            </div>
          </>
        )}
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const v = draft.trim().toLowerCase();
            if (!/^\S+@\S+\.\S+$/.test(v)) {
              setErr("Esse e-mail não parece certo. Confere e tenta de novo.");
              return;
            }
            setErr(null);
            setEmail(v);
          }}
        >
          <Field label="Teu e-mail" error={err}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-invalid={Boolean(err)}
            />
          </Field>
          <Button type="submit" size="lg">
            Continuar
          </Button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-neutral-500">
        Grátis pra começar. Sem cartão, sem comissão sobre cachê.
      </p>
    </main>
  );
}
