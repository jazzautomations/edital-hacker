import { NextResponse } from "next/server";

// Login é por código no e-mail (convex/auth.ts). O WorkOS saiu do fluxo:
// quem cair em /login vai direto pro formulário.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/inicio", request.url));
}
