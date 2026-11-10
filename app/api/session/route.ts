import { withAuth } from "@workos-inc/authkit-nextjs";

// /api/session — o cliente descobre (a) se WorkOS está ativo e (b) o email
// verificado da sessão. Sem WORKOS_CLIENT_ID responde auth:false → o front cai
// no modo demo (email → perfil via localStorage).
export async function GET() {
  if (!process.env.WORKOS_CLIENT_ID) {
    return Response.json({ auth: false, email: null });
  }
  const { user } = await withAuth();
  return Response.json({
    auth: true,
    email: user?.email ?? null,
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null,
  });
}
