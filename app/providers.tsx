"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";

// No servidor (pré-render) as páginas precisam sair com HTML de verdade, mas o
// cliente do Convex não pode nascer lá: ele gera ids aleatórios e abriria
// conexão. Então o servidor recebe um cliente "mudo" (toda consulta responde
// "carregando") e o cliente real só é criado no navegador.
// Antes a árvore inteira era carregada com `ssr: false` e o HTML de todas as
// páginas chegava vazio pra buscador e pré-visualização de link.
const SERVER_STUB = {
  watchQuery: () => ({
    onUpdate: () => () => {},
    localQueryResult: () => undefined,
    journal: () => undefined,
  }),
  mutation: async () => {
    throw new Error("indisponível no servidor");
  },
  action: async () => {
    throw new Error("indisponível no servidor");
  },
} as unknown as ConvexReactClient;

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState<ConvexReactClient | null>(() => {
    if (typeof window === "undefined") return SERVER_STUB;
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    return url ? new ConvexReactClient(url) : null;
  });
  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 text-center">
        <p className="text-sm text-neutral-400">Banco de dados não configurado (NEXT_PUBLIC_CONVEX_URL).</p>
      </div>
    );
  }
  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
