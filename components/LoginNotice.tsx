"use client";

import { useEffect, useState } from "react";

/** Aviso quando o login social volta com erro (?login=falhou). */
export function LoginNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("login") === "falhou") {
      setShow(true);
      url.searchParams.delete("login");
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  }, []);
  if (!show) return null;
  return (
    <div role="alert" className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
      Não deu pra entrar com a conta agora. Usa teu e-mail aqui embaixo que funciona igual.{" "}
      <button onClick={() => setShow(false)} className="ml-2 underline underline-offset-2">
        fechar
      </button>
    </div>
  );
}
