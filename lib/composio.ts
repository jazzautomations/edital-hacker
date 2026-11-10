// Composio — as mãos do agente no mundo exterior (1000+ integrações).
// v3 REST: backend.composio.dev/api/v3, auth x-api-key, execução por tool slug.
// Sem COMPOSIO_API_KEY as tools degradam com instrução honesta de conexão.

const API = "https://backend.composio.dev/api/v3";

export function composioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_GMAIL_ACCOUNT);
}

async function execute(slug: string, args: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API}/tools/execute/${slug}`, {
    method: "POST",
    headers: {
      "x-api-key": process.env.COMPOSIO_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connected_account_id: process.env.COMPOSIO_GMAIL_ACCOUNT,
      arguments: args,
    }),
  });
  if (!res.ok) throw new Error(`Composio ${slug} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Últimos emails não-lidos da caixa do artista. */
export async function fetchUnreadEmails(max = 10): Promise<{ from: string; subject: string; date?: string; id?: string }[]> {
  const r = await execute("GMAIL_FETCH_EMAILS", {
    max_results: max,
    label_ids: ["INBOX", "UNREAD"],
    verbose: false,
  });
  const msgs = r?.data?.messages ?? r?.data ?? [];
  return (Array.isArray(msgs) ? msgs : []).slice(0, max).map((m: any) => ({
    from: m.sender ?? m.from ?? "?",
    subject: m.subject ?? "(sem assunto)",
    date: m.messageTimestamp ?? m.internalDate ?? undefined,
    id: m.messageId ?? m.id ?? undefined,
  }));
}

/** Cria rascunho de resposta — o artista revisa e envia (preparar, não agir por ele). */
export async function createDraft(to: string, subject: string, body: string, threadId?: string): Promise<string> {
  const r = await execute("GMAIL_CREATE_EMAIL_DRAFT", {
    recipient_email: to,
    subject,
    body,
    ...(threadId ? { thread_id: threadId } : {}),
  });
  return r?.data?.draft_id ?? r?.data?.id ?? "rascunho criado";
}
