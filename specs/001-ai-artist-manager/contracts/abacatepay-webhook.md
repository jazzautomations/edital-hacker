# Contract: POST /api/webhooks/abacatepay

Confirmação de pagamento → ativação de plano (US5, FR-015). DevMode durante
o hack.

## Eventos consumidos

| Evento | Ação |
|---|---|
| `subscription.completed` | assinatura `subs_` ativa → `profiles.plan = manager|manager_pro` pelo `externalId` (nosso profileId); registra em `subscriptions` |
| `subscription.cancelled` | plano → `free`; `subscriptions.status = CANCELLED` (falha após retryPolicy esgotada vem com `cancelledDueTo: max_payment_retries_exceeded`) |
| `subscription.trial_started` | status ACTIVE em trial; guardar `trialEndsAt` |
| `checkout.completed` (avulso) | `externalId` = `unlock:{profileId}:{opportunityId}` → insere em `unlockedEdits` |

## Request (shape AbacatePay)

```json
{
  "event": "subscription.completed",
  "devMode": true,
  "data": {
    "id": "subs_…", "checkoutId": "bill_…", "customerId": "cust_…",
    "externalId": "k57…", "status": "ACTIVE", "method": "PIX",
    "retryPolicy": {"maxRetry": 5, "retryEvery": 3}
  }
}
```

## Response

`200 {ok:true}` sempre após processamento idempotente; `401` segredo de
webhook inválido. Idempotência: evento já processado (mesmo `data.id` +
`event` em log) → `200` sem efeito.

## Regras

- Segredo do webhook verificado antes de qualquer escrita (header/query da
  AbacatePay).
- Nunca confiar só no `POST /subscriptions/create` — ele retorna checkout
  `PENDING`; a ativação real chega aqui.
- `methods` aceitos: `["PIX","CARD"]`; assinatura Pix = Pix Automático.
