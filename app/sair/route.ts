import { NextResponse } from "next/server";
import { signOut } from "@workos-inc/authkit-nextjs";

// Sair: encerra a sessão do WorkOS quando existe; o modo e-mail só limpa o
// navegador (feito no cliente antes de chegar aqui).
export async function GET(request: Request) {
  const home = new URL("/", request.url);
  if (!process.env.WORKOS_CLIENT_ID) return NextResponse.redirect(home);
  try {
    await signOut({ returnTo: home.toString() });
  } catch (e) {
    // signOut redireciona lançando NEXT_REDIRECT — isso precisa propagar
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error("[sair]", e);
  }
  return NextResponse.redirect(home);
}
