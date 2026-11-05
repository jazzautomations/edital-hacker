# Quickstart: validação end-to-end — Manager

Prova cada user story de `spec.md` rodando de verdade.

## Setup

```bash
cp .env.example .env.local
# mínimo p/ demo: NEXT_PUBLIC_CONVEX_URL + GEMINI_API_KEY
npx convex dev        # login → deployment → codegen real + deploy das functions
npm run dev           # http://localhost:3000
```

## US1 — Radar (FR-001..FR-007)

```bash
npx convex run ingest:run
```

Esperado: relatório por fonte (≥6 `found>0`); `npx convex run
opportunities:list '{limit:5}'` retorna oportunidades reais com
`registrationTo` futuro. UI `/oportunidades` lista com badge de prazo,
fonte e valor. Fonte fora do ar aparece com `error` sem derrubar o resto.

## US2 — Sabatina (FR-008..FR-010)

1. Abrir `/oportunidades` → clicar "Sabatinar".
2. Preencher perfil → "Começar sabatina".
3. Responder 4–6 perguntas (testar resposta vaga → deve aprofundar).

Esperado: parecer com score 0–100, gaps, missingDocs citando o edital real;
aviso de decisão final da banca. Edital sem `enriched` → aviso de análise
parcial.

## US3 — Pipeline (FR-011..FR-012)

1. `/pipeline` → email → perfil criado.
2. No feed: marcar interesse numa oportunidade → aparece em "Interessado".
3. Mover card entre colunas → persistir (reload prova).

Esperado: card mostra nota da sabatina quando existir.

## US4 — Alertas (FR-013)

```bash
npx convex run alerts:run   # com RESEND_API_KEY setada
npx convex run alerts:run   # 2ª vez: zero reenvios (alertLog dedup)
```

Sem chave: retorna `{skipped:true}` sem quebrar.

## US5 — Pagamentos (FR-014..FR-015)

1. Criar produto c/ `cycle: MONTHLY` na loja AbacatePay (devMode).
2. `POST /subscriptions/create` → checkout `bill_` → pagar no sandbox.
3. Webhook `subscription.completed` → `profiles.plan` muda; feed mostra
   sabatina ilimitada.

Esperado em SC-006: fluxo < 3 min. Avulso: `checkouts/create` com
`externalId=unlock:…` destrava uma sabatina por Pix.

## Gates de build

`npm run build` + `npx tsc --noEmit` limpos antes de commit.
