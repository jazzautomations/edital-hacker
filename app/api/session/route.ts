import { withAuth } from "@workos-inc/authkit-nextjs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// /api/session — o navegador pergunta: tem login por conta (WorkOS) ativo? E
// tem alguém logado por ele? Se tiver, o servidor troca essa prova por uma
// sessão do app (o mesmo token usado no login por código).
export async function GET() {
  if (!process.env.WORKOS_CLIENT_ID) {
    return Response.json({ auth: false, email: null });
  }
  let email: string | null = null;
  try {
    const { user } = await withAuth();
    email = user?.email?.toLowerCase() ?? null;
  } catch {
    // provedor fora do ar ou chave inválida: segue só com o login por código
    return Response.json({ auth: true, email: null });
  }
  if (!email) return Response.json({ auth: true, email: null });
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    const { token } = await convex.action(api.auth.serverSession, { email, secret: process.env.NOTIFY_SECRET ?? "" });
    return Response.json({ auth: true, email, token });
  } catch {
    return Response.json({ auth: true, email: null });
  }
}
