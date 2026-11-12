"use client";

import { useAction } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthEmail } from "@/lib/useAuth";
import { Button, Field, Input, LinkButton } from "@/components/ui";

/**
 * Entrar em duas etapas: e-mail → código de 6 dígitos que chega nele.
 * Usado pela porta de entrada das áreas logadas e pelo onboarding.
 */
export function EmailCodeForm({ cta = "Continuar", hint }: { cta?: string; hint?: string }) {
  const { setSession, authEnabled, locked } = useAuthEmail();
  const requestCode = useAction(api.auth.requestCode);
  const verifyCode = useAction(api.auth.verifyCode);

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      setErr("Esse e-mail não parece certo. Confere e tenta de novo.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await requestCode({ email: v });
      setEmail(v);
      setStep("code");
      setCode("");
      setWait(r.sent ? 30 : (r.waitSeconds ?? 30));
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch {
      setErr("Não consegui enviar o código agora. Tenta de novo em instantes.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(value: string) {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await verifyCode({ email, code: value });
      if (r.token && r.email) {
        setSession(r.token, r.email);
        return; // a página troca sozinha quando a sessão aparece
      }
      setErr(
        r.error === "expired"
          ? "Esse código venceu. Pede um novo."
          : r.error === "locked"
            ? "Muitas tentativas. Pede um código novo."
            : "Código errado. Confere os 6 números no e-mail."
      );
      setCode("");
      codeRef.current?.focus();
    } catch {
      setErr("Não deu pra conferir agora. Tenta de novo.");
    } finally {
      setBusy(false);
    }
  }

  if (step === "code") {
    return (
      <form className="flex flex-col gap-3" noValidate onSubmit={(e) => { e.preventDefault(); void confirm(code); }}>
        <p className="text-sm leading-relaxed text-neutral-300">
          Mandei um código de 6 números pra <b className="text-neutral-50">{email}</b>. Ele chega em menos de 1 minuto. Olha também o spam.
        </p>
        <Field label="Código" error={err}>
          <Input
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            aria-invalid={Boolean(err)}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(v);
              if (v.length === 6) void confirm(v);
            }}
            className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
          />
        </Field>
        <Button type="submit" size="lg" loading={busy} disabled={code.length !== 6}>
          Entrar
        </Button>
        <div className="flex items-center justify-between text-sm">
          <button type="button" className="text-neutral-400 underline underline-offset-2 hover:text-neutral-100" onClick={() => { setStep("email"); setErr(null); }}>
            Usar outro e-mail
          </button>
          <button type="button" disabled={wait > 0 || busy} onClick={() => void send()} className="text-emerald-300 underline underline-offset-2 disabled:text-neutral-600 disabled:no-underline">
            {wait > 0 ? `Reenviar em ${wait}s` : "Reenviar código"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      {authEnabled && !locked && (
        <>
          <LinkButton href="/login" variant="secondary" size="lg" className="w-full !bg-neutral-100 !text-neutral-950 hover:!bg-white">
            Entrar com Google ou conta
          </LinkButton>
          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="h-px flex-1 bg-neutral-800" />
            ou com um código no teu e-mail
            <span className="h-px flex-1 bg-neutral-800" />
          </div>
        </>
      )}
      <form className="flex flex-col gap-3" noValidate onSubmit={send}>
        <Field label="Teu e-mail" error={err} hint={hint}>
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(err)}
          />
        </Field>
        <Button type="submit" size="lg" loading={busy}>
          {cta}
        </Button>
      </form>
    </>
  );
}
