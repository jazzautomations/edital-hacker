import { NextResponse, type NextRequest } from "next/server";
import type { NextMiddleware } from "next/server";

// WorkOS AuthKit (sponsor) — só ativa com WORKOS_CLIENT_ID configurado.
// Sem a chave o proxy é no-op: o app segue no modo demo (email → perfil).
let mw: NextMiddleware | null = null;

export async function proxy(request: NextRequest) {
  if (!process.env.WORKOS_CLIENT_ID) return NextResponse.next();
  if (!mw) {
    const { authkitProxy } = await import("@workos-inc/authkit-nextjs");
    mw = authkitProxy();
  }
  return mw(request, {} as any);
}

export const config = {
  matcher: ["/((?!_next|api/webhooks|favicon.ico|.*\\..*).*)"],
};
