# Credenciais — checklist de setup do demo

Ordem = o que destrava mais rápido. Marque `[x]` conforme for.

**Regra dos DOIS lugares**: `.env.local` alimenta as rotas Next; as actions do
Convex (`dossier`, `enrich`, `alerts`, `billing`, `pncp`, `monitors`) leem do env
do Convex. Chaves marcadas com 🔁 vão nos DOIS.

Para o Convex:
```bash
cd /home/h/edital-hacker
npx convex env set CHAVE valor   # repete pra cada chave 🔁
```

---

## 1. LLM — o cérebro (destrava coach, sabatina, dossiê, pitch, contratos) 🔁

Qualquer endpoint OpenAI-compatível serve (OpenAI, Gemini, Groq, DeepSeek, OpenRouter).

```bash
LLM_API_KEY=        # ex: sk-...
LLM_BASE_URL=       # ex: https://api.openai.com/v1  (Gemini: https://generativelanguage.googleapis.com/v1beta/openai/)
LLM_MODEL=          # ex: gpt-4o-mini / gemini-2.5-flash
```

## 2. Firecrawl — prospecção + dossiê OSINT + enrich 🔁

firecrawl.dev → API keys (free tier ~500 créditos).

```bash
FIRECRAWL_API_KEY=  # fc-...
```

## 3. Segredos da casa (1 comando gera os 2)

```bash
openssl rand -hex 32   # cola o resultado nos dois:
NOTIFY_SECRET=    # .env.local + `npx convex env set` 🔁
APP_URL=http://localhost:3000   # dev; produção = URL pública (webhook depende dela) 🔁
```

## 4. Resend — alertas por email 🔁

resend.com → API Keys (free). **Gotcha (do 360AA)**: sem domínio verificado só
entrega pro email do dono da conta — pro demo, manda alerta pro teu próprio email.

```bash
RESEND_API_KEY=     # re_...
RESEND_FROM="Manager <onboarding@resend.dev>"   # ou teu domínio verificado
```

## 5. Evolution — WhatsApp (tu JÁ TEM rodando no imac)

Pega a key direto do container:

```bash
ssh jazz@100.69.84.45 "docker inspect evolution --format '{{range .Config.Env}}{{println .}}{{end}}' | grep AUTHENTICATION_API_KEY"
```

```bash
EVOLUTION_API_URL=http://100.69.84.45:8080
EVOLUTION_API_KEY=<a key do comando acima>
EVOLUTION_INSTANCE=jazz
```

## 6. Composio — mãos do agente (Gmail + Calendar)

dashboard.composio.dev → API key. Depois cria **2 auth configs** (toolkit Gmail
→ Gmail; toolkit Google Calendar → Calendar) e copia os `auth_config_id`.

```bash
COMPOSIO_API_KEY=
COMPOSIO_GMAIL_AUTH_CONFIG=     # ac_...
COMPOSIO_CALENDAR_AUTH_CONFIG=  # ac_...
```

Depois, na UI do app: `/coach` → "conectar gmail" + "conectar agenda" (OAuth).

**Webhook tempo-real** (resposta de lead → pendingAction em ~2min):

```bash
curl -X POST https://backend.composio.dev/api/v3/webhook_subscriptions \
  -H "x-api-key: $COMPOSIO_API_KEY" -H "Content-Type: application/json" \
  -d '{"webhook_url":"<APP_URL>/api/webhooks/composio","enabled_events":["composio.trigger.message"]}'
# guarda o "secret" retornado:
COMPOSIO_WEBHOOK_SECRET=
```

## 7. Agora — Jarvis de voz

console.agora.io → projeto → App ID + Customer ID/Secret + App Certificate.
`VOICE_LLM_API_KEY` = a key do LLM que o agente de voz usa (pode ser a mesma do
item 1 — o LLM_BASE_URL do agente já vai no código).

```bash
AGORA_APP_ID=
AGORA_CUSTOMER_ID=
AGORA_CUSTOMER_SECRET=
AGORA_APP_CERTIFICATE=
VOICE_LLM_API_KEY=
AGORA_LLM_MODEL=     # opcional
```

⚠️ As tools do agente chamam `<APP_URL>/api/coach-tool` — precisa ser URL
**pública** (deploy ou tunnel tipo `cloudflared`) pro callback funcionar.

## 8. AbacatePay — checkout (sponsor, sandbox)

Dashboard → API key sandbox + cria os produtos e copia os IDs. 🔁 = Convex também.

```bash
ABACATEPAY_API_KEY=            # .env.local (rota /api checkout)
ABACATEPAY_SANDBOX=true
ABACATEPAY_WEBHOOK_SECRET=     # 🔁 Convex (billing.ts)
ABACATE_PRODUCT_UNLOCK=        # sabatina avulsa R$9,90        🔁
ABACATE_PRODUCT_MANAGER_MONTHLY=   # 🔁
ABACATE_PRODUCT_MANAGER_ANNUAL=    # 🔁
ABACATE_PRODUCT_PRO_MONTHLY=       # 🔁
ABACATE_PRODUCT_PRO_ANNUAL=        # 🔁
```

## 9. Convex já está ✅

`.env.local` já tem `CONVEX_DEPLOYMENT` + `NEXT_PUBLIC_CONVEX_URL` — `npx convex dev` já rodou.

## 10. Fase 2 / opcional (pula se quiser)

- `WORKOS_CLIENT_ID/API_KEY/COOKIE_PASSWORD` — AuthKit (sponsor). Login hoje é por email simples.
- `NVOIP_*` — SMS/voz/WABA oficial (produção). Demo usa Evolution.
- `FIRECRAWL_WEBHOOK_SECRET` — só se ligar monitor de fonte bloqueada. 🔁
- `NVOIP_WEBHOOK_SECRET` — 🔁

---

## Mínimo pro Jarvis vivo end-to-end

`LLM_*` + `FIRECRAWL_API_KEY` + `NOTIFY_SECRET`/`APP_URL` + `RESEND_*` +
`EVOLUTION_*` + `COMPOSIO_*` + `AGORA_*` = itens **1–7**.

Depois de preencher: `npm run build` verde → me avisa que eu testo o fluxo
inteiro (radar → sabatina → dossiê → email → agenda → voz).
