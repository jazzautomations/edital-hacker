// Composio — as mãos do agente no mundo exterior (1000+ integrações).
// v3 REST: backend.composio.dev/api/v3, auth x-api-key.
// Padrão verificado no 360AA: user_id resolve a conta conectada (usamos o
// email do perfil como user_id) + auth_config_id por provider — o artista
// conecta o Gmail via /api/email-connect e o agente executa tools por slug.
// Sem COMPOSIO_API_KEY/GMAIL_AUTH_CONFIG as tools degradam com instrução honesta.

const API = "https://backend.composio.dev/api/v3";

export function composioConfigured(): boolean {
  return Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_GMAIL_AUTH_CONFIG);
}

function headers() {
  return {
    "x-api-key": process.env.COMPOSIO_API_KEY!,
    "Content-Type": "application/json",
  };
}

/** Inicia o OAuth managed do Gmail pro user_id (email do perfil). */
export async function linkGmail(userId: string, callbackUrl: string): Promise<{ redirectUrl?: string; error?: string }> {
  const res = await fetch(`${API}/connected_accounts/link`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      auth_config_id: process.env.COMPOSIO_GMAIL_AUTH_CONFIG,
      user_id: userId,
      callback_url: callbackUrl,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: data?.error?.message ?? `HTTP ${res.status}` };
  return { redirectUrl: data.redirect_url };
}

/** Status: tem conta Gmail ACTIVE pro user_id? Retorna o email conectado. */
export async function gmailStatus(userId: string): Promise<{ connected: boolean; email?: string }> {
  const res = await fetch(
    `${API}/connected_accounts?user_ids=${encodeURIComponent(userId)}&auth_config_ids=${process.env.COMPOSIO_GMAIL_AUTH_CONFIG}&statuses=ACTIVE`,
    { headers: headers() }
  );
  const data = await res.json().catch(() => ({}));
  const acc = (data?.items ?? [])[0];
  if (!acc) return { connected: false };
  const s = acc?.state?.val ?? acc?.data ?? {};
  return { connected: true, email: s?.authed_user?.email ?? s?.email ?? s?.profile?.emailAddress };
}

async function execute(slug: string, userId: string, args: Record<string, unknown>): Promise<any> {
  const res = await fetch(`${API}/tools/execute/${slug}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ user_id: userId, arguments: args }),
  });
  if (!res.ok) throw new Error(`Composio ${slug} HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

export interface InboxMessage {
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  threadId?: string;
  messageId?: string;
  date?: string;
}

/** Busca inbox do artista — query livre do Gmail ("in:inbox newer_than:14d"). */
export async function fetchInbox(userId: string, query = "in:inbox is:unread", max = 15): Promise<InboxMessage[]> {
  const r = await execute("GMAIL_FETCH_EMAILS", userId, {
    query,
    max_results: max,
    verbose: true,
  });
  const raw = r?.data ?? r;
  const msgs = raw?.messages ?? raw?.emails ?? raw?.response_data?.messages ?? [];
  return (Array.isArray(msgs) ? msgs : []).slice(0, max).map((m: any) => {
    const from = m.from ?? m.sender ?? m.From ?? m.payload?.from ?? "";
    const emailMatch = String(from).match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    return {
      from: String(from).slice(0, 120),
      fromEmail: emailMatch ? emailMatch[0].toLowerCase() : String(from).toLowerCase(),
      subject: String(m.subject ?? m.Subject ?? m.payload?.subject ?? "(sem assunto)").slice(0, 200),
      snippet: String(m.snippet ?? m.preview ?? m.body ?? m.messageText ?? "").slice(0, 500),
      threadId: m.threadId ?? m.thread_id ?? undefined,
      messageId: m.messageId ?? m.id ?? undefined,
      date: m.messageTimestamp ?? m.internalDate ?? undefined,
    };
  });
}

/** Cria rascunho — o artista revisa e envia (preparar, não agir por ele). */
export async function createDraft(
  userId: string,
  to: string,
  subject: string,
  body: string,
  threadId?: string
): Promise<string> {
  const r = await execute("GMAIL_CREATE_EMAIL_DRAFT", userId, {
    recipient_email: to,
    subject,
    body,
    ...(threadId ? { thread_id: threadId } : {}),
  });
  const d = r?.data ?? r;
  return d?.draft_id ?? d?.id ?? "rascunho criado";
}
