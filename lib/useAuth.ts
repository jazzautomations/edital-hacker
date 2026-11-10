"use client";

import { useCallback, useEffect, useState } from "react";

export type AuthState = {
  email: string;
  setEmail: (e: string) => void;
  /** true = sessão WorkOS verificada (não pode trocar de email digitando) */
  locked: boolean;
  /** true = WORKOS_CLIENT_ID configurado no servidor */
  authEnabled: boolean;
  ready: boolean;
};

// Ponte sessão WorkOS ↔ perfil: com sponsor ativo, o email vem verificado da
// sessão; sem a chave, cai no modo demo (localStorage manager_email).
export function useAuthEmail(): AuthState {
  const [state, setState] = useState<AuthState>({
    email:
      typeof window !== "undefined"
        ? localStorage.getItem("manager_email") ?? ""
        : "",
    setEmail: () => {},
    locked: false,
    authEnabled: false,
    ready: typeof window === "undefined",
  });

  const setEmail = useCallback((e: string) => {
    localStorage.setItem("manager_email", e);
    setState((s) => ({ ...s, email: e }));
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!alive || !s) return;
        if (s.auth) {
          setState((prev) => ({
            ...prev,
            authEnabled: true,
            locked: !!s.email,
            email: s.email ?? prev.email,
            ready: true,
          }));
        } else {
          setState((prev) => ({ ...prev, ready: true }));
        }
      })
      .catch(() => alive && setState((p) => ({ ...p, ready: true })));
    return () => {
      alive = false;
    };
  }, []);

  return { ...state, setEmail };
}
