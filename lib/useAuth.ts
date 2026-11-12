"use client";

import { ConvexHttpClient } from "convex/browser";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { api } from "@/convex/_generated/api";

export type AuthState = {
  /** e-mail confirmado da sessão ("" = ninguém logado) */
  email: string;
  /** token da sessão; é o que prova quem você é pro servidor */
  token: string;
  /** guarda a sessão depois que o código do e-mail (ou o WorkOS) confirmou */
  setSession: (token: string, email: string) => void;
  signOut: () => Promise<void>;
  /** true = WORKOS_CLIENT_ID configurado no servidor */
  authEnabled: boolean;
  /** true = sessão veio do WorkOS */
  locked: boolean;
  ready: boolean;
};

// Estado ÚNICO da sessão, compartilhado por menu, páginas e formulário de
// entrada. O e-mail só aparece aqui depois de confirmado pelo servidor: o que
// fica no navegador é um token, e digitar o e-mail de outra pessoa não abre nada.

type Snapshot = { email: string; token: string; authEnabled: boolean; locked: boolean; ready: boolean };

const KEY = "manager_session";
const SERVER: Snapshot = { email: "", token: "", authEnabled: false, locked: false, ready: false };
let state: Snapshot = SERVER;
let started = false;
const listeners = new Set<() => void>();

function set(patch: Partial<Snapshot>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function client() {
  return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
}

function stored(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function save(token: string) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
    localStorage.removeItem("manager_email"); // formato antigo, sem verificação
  } catch {}
}

async function start() {
  if (started || typeof window === "undefined") return;
  started = true;

  // 1) login por conta (WorkOS): o servidor confirma e já entrega uma sessão
  let authEnabled = false;
  try {
    const r = await fetch("/api/session");
    const s = r.ok ? await r.json() : null;
    authEnabled = Boolean(s?.auth);
    if (s?.token && s?.email) {
      save(s.token);
      set({ token: s.token, email: s.email, authEnabled, locked: true, ready: true });
      return;
    }
  } catch {}

  // 2) sessão guardada de um login por código: confere se ainda vale
  const token = stored();
  if (token) {
    try {
      const me = await client().query(api.auth.me, { token });
      if (me?.email) {
        set({ token, email: me.email, authEnabled, ready: true });
        return;
      }
      save("");
    } catch {
      // sem rede: mantém o token pra tentar de novo depois, mas não libera nada
    }
  }
  set({ authEnabled, ready: true });

  window.addEventListener("storage", (e) => {
    if (e.key === KEY && e.newValue !== state.token) window.location.reload();
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
  useEffect(() => {
    void start();
  }, []);

  const setSession = useCallback((token: string, email: string) => {
    save(token);
    set({ token, email: email.trim().toLowerCase(), ready: true });
  }, []);

  const signOut = useCallback(async () => {
    const token = state.token;
    save("");
    set({ token: "", email: "", locked: false });
    if (token) await client().mutation(api.auth.signOut, { token }).catch(() => {});
  }, []);

  return { ...snap, setSession, signOut };
}
