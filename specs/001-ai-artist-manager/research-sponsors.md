# Dossiê de sponsors — o que cada um oferece e o que usar (dossiê verificado)

> Pesquisa 2026-11-10. Cruzado com o estado real do código. Fontes ao final.
> Regulamento: CONTEXTO.md §10.2–10.3.

## Estado atual vs. disponível

| Sponsor | Usamos hoje | Feature extra que vale implementar | Esforço | Impacto júri |
|---|---|---|---|---|
| Convex | DB, 5 crons, 3 http webhooks, realtime | **file storage** (campo `storageId` já órfão no schema!) + `@convex-dev/resend` component + `searchIndex`/`runAfter` | S–M | Alto |
| Firecrawl | scrape, search, agent, monitor | `/v2/map` (1 crédito) + `webhook` param no agent + `changeTracking` em edital marcado + scrape json-format no enrich | S–M | **Altíssimo — CTO Firecrawl preside a comissão** |
| Nvoip | lib codada, não live | torpedo TTS c/ número virtual+DDD ("o coach liga") + OTP no onboarding; ⚠️ revisar payload `/torpedo/voice` (DTMF) vs `/torpedo/` (TTS simples) | M | Alto — SMS/voz só eles fazem |
| Devin | nós | citar no vídeo (meta-demo) | — | Simbólico |
| Resend | send + batch | **inbound `email.received` → reply-detect SEM depender do Gmail do usuário** + `scheduledAt` + broadcasts + tracking de abertura | M | Alto — fecha loop do agente |
| AbacatePay | checkout + subscriptions + webhook | `pixQrCode/create` → **QR inline no paywall** (jurado escaneia na tela) + handler `payment_failed` | S | Alto — QR ao vivo > redirect |
| WorkOS | AuthKit (implementado nesta rodada) | Organizations (equipe do artista) + Radar anti-fraude (1k checks grátis) + passkeys/waitlist | S–M | Médio-alto |
| Capivarafy | — | pitch: nosso produto É o domínio deles p/ artistas (R$30MM captados prova que se paga por isso) | S | Médio |
| Globalfy | — | linha de roadmap (LLC p/ artista faturando em dólar) | S | Baixo |
| Jumpstart | — | linha de pitch: nosso dossiê/EPK/contratos = base probatória de petição **O-1B** (o visto de artista) | S | Baixo-médio, conexão genuína |
| Puentes | — | consequência de vencer | — | — |

## Achados de código (bugs/gaps encontrados na pesquisa)

1. ✅ CORRIGIDO nesta rodada — `convex/billing.ts`: `subscription.payment_failed` caía no branch ACTIVE; agora vira `PAST_DUE` sem derrubar o plano.
2. `documents.storageId: v.id("_storage")` existe no schema mas **file storage nunca foi ligado** — nenhum `generateUploadUrl`/`ctx.storage` no repo. Campo órfão = feature meio pronta (upload de NF/comprovante na prestação).
3. **Resend inbound** pode substituir o reply-detect dependente do Gmail: envios do Manager saem com `reply_to` no nosso domínio Resend → resposta do contratante cai no webhook `email.received` → move o lead. Zero fricção pro usuário, sponsor puro.
4. Nvoip `/v3/sms` texto livre exige liberação da conta — usar `/v3/sms/sendTemplate` (nossa lib já tem fallback).
5. AbacatePay tem `POST /v1/webhooks/create` — provisiona webhook por API (setup programático).

## Prioridade recomendada

1. **Resend inbound reply-detect** — único item que destrava arquitetura, não só checkbox.
2. **AbacatePay `pixQrCode/create`** — QR na tela = a cena de pagamento do vídeo.
3. **Convex file storage** — liga o `storageId` órfão → prestação com comprovante real.
4. **Firecrawl**: `/v2/map` + webhook no agent + `changeTracking` em edital marcado ("o edital que você vai submeter mudou de prazo" = alerta de altíssimo valor).
5. **Nvoip live**: conta nova → OAuth client → validar payload torpedo contra OpenAPI real.
6. **WorkOS Organizations** — produtor/contador no perfil do artista (modela "equipe", não só solo).

## Não verificado (validar com credencial real)

- Payload exato `/v3/torpedo/voice` vs `/torpedo/` (docs Nvoip divergem).
- `pix_key.received` na conta do hack (PIX recebido → reconciliação automática de cachê = `gigs.status=pago`).
- Escopo exato do pacote WorkOS de finalista (quais produtos além de AuthKit+domínio).

## Fontes

docs.convex.dev (limits, components, scheduling, text-search) · convex.dev/components/resend · docs.firecrawl.dev (v2: agent, change-tracking, map, mcp; `/extract` deprecated → HTTP 410 em 10/dez/2026) · suporte.nvoip.com.br · github.com/Nvoip/nvoip-api-examples · resend.com/docs (receiving) + pricing · docs.abacatepay.com (pixQrCode, subscriptions, webhooks/events) · workos.com (pricing: AuthKit grátis até 1M MAU; Radar 1k checks grátis) · capivarafy.com · globalfy.com · gojumpstart.com · puentes.antigravity.capital
