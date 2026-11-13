import { NextResponse } from "next/server";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";

// getSignInUrl() grava o cookie PKCE — só pode rodar em Route Handler,
// nunca no render de uma page (era o que derrubava o /login em prod).
// /login?com=google pula a tela do AuthKit e vai direto pro Google
// (mesmo PKCE e mesmo /callback, só troca o provedor).
export async function GET(request: Request) {
  if (!process.env.WORKOS_CLIENT_ID) {
    return NextResponse.redirect(new URL("/inicio", request.url));
  }
  const url = new URL(await getSignInUrl());
  if (new URL(request.url).searchParams.get("com") === "google") {
    url.searchParams.set("provider", "GoogleOAuth");
    url.searchParams.delete("screen_hint");
  }
  return NextResponse.redirect(url);
}
