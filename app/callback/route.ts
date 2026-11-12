import { NextResponse } from "next/server";
import { handleAuth } from "@workos-inc/authkit-nextjs";

// Se a troca do código falhar (chave do WorkOS inválida, cookie expirado…) o
// usuário volta pro app com um aviso em vez de cair numa página de erro crua.
export const GET = handleAuth({
  returnPathname: "/inicio",
  onError: async ({ error, request }) => {
    console.error("[auth callback]", error);
    return NextResponse.redirect(new URL("/inicio?login=falhou", request.url));
  },
});
