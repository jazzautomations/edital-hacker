import { NextResponse } from "next/server";
import { getSignInUrl } from "@workos-inc/authkit-nextjs";

// getSignInUrl() grava o cookie PKCE — só pode rodar em Route Handler,
// nunca no render de uma page (era o que derrubava o /login em prod).
export async function GET(request: Request) {
  if (!process.env.WORKOS_CLIENT_ID) {
    return NextResponse.redirect(new URL("/coach", request.url));
  }
  return NextResponse.redirect(await getSignInUrl());
}
