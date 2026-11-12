"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type AuthState = {
  email: string;
  setEmail: (e: string) => void;
  /** true = sessão WorkOS verificada (não pode trocar de email digitando) */
  locked: boolean;
  /** true = WORKOS_CLIENT_ID configurado no servidor */
  authEnabled: boolean;
  ready: boolean;
};

// Ponte sessão WorkOS ↔ perfil: com o provedor ativo, o email vem verificado da
// sessão; sem ele, vale o email guardado no navegador (localStorage).
//
// Estado ÚNICO compartilhado: menu, página e formulário de entrada leem a mesma
// fonte. Antes cada um tinha a sua cópia e o menu só percebia o login depois de
// recarregar — além de cada componente bater em /api/session por conta própria.

type Snapshot = { email: string; locked: boolean; authEnabled: boolean; ready: boolean };

const KEY = "manager_email";
const SERVER: Snapshot = { email: "", locked: false, authEnabled: false, ready: false };
let state: Snapshot = SERVER;
let started = false;
const listeners = new Set<() => void>();

function set(patch: Partial<Snapshot>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function readStored(): string {
  try {
    return (localStorage.getItem(KEY) ?? "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  set({ email: readStored() });
  fetch("/api/session")
    .then((r) => (r.ok ? r.json() : null))
    .then((s) => {
      if (s?.auth) {
        const verified = typeof s.email === "string" && s.email ? s.email.toLowerCase() : "";
        if (verified) {
          try {
            localStorage.setItem(KEY, verified);
          } catch {}
        }
        set({ authEnabled: true, locked: Boolean(verified), email: verified || state.email, ready: true });
      } else {
        set({ ready: true });
      }
    })
    .catch(() => set({ ready: true }));
  // outra aba entrou ou saiu
  window.addEventListener("storage", (e) => {
    if (e.key === KEY && !state.locked) set({ email: (e.newValue ?? "").trim().toLowerCase() });
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useAuthEmail(): AuthState {
  const snap = useSyncExternalStore(subscribe, () => state, () => SERVER);
  useEffect(start, []);

  const setEmail = useCallback((e: string) => {
    if (state.locked) return;
    const v = e.trim().toLowerCase();
    try {
      if (v) localStorage.setItem(KEY, v);
      else localStorage.removeItem(KEY);
    } catch {}
    set({ email: v });
  }, []);

  return { ...snap, setEmail };
}
