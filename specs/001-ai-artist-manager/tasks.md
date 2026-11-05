# Tasks: Manager — Empresário de IA para Artistas Independentes

**Input**: Design documents from `/specs/001-ai-artist-manager/`
**Prerequisites**: plan.md ✅ · spec.md ✅ · research.md ✅ · data-model.md ✅ · contracts/ ✅ · quickstart.md ✅

**Estado real**: scaffold e espinha dorsal já construídos e verificados
(`next build` + `tsc` limpos; ingestão Mapas testada ao vivo: 132 opps/6
fontes). Tasks já entregues estão marcadas `[x]` para preservar o mapa
completo do que a spec exige.

## Phase 1: Setup

- [x] T001 Scaffold Next.js 16 + Tailwind + providers Convex em `app/`
- [x] T002 [P] `.env.example` com todas as variáveis (Gemini, Firecrawl, Resend, WorkOS, AbacatePay)
- [x] T003 [P] Repo público GitHub + histórico pós-abertura (constituição V)
- [x] T004 [P] `lib/types.ts` espelho do schema p/ UI
- [ ] T005 `npx convex dev` com login → deployment + codegen real substituindo stubs `convex/_generated/` **(ação do usuário)**

## Phase 2: Foundational (bloqueantes)

- [x] T006 Schema Convex: opportunities, profiles, pipelineItems, contacts, documents, alertLog em `convex/schema.ts`
- [x] T007 Estender `convex/schema.ts` com `sabatinaSessions`, `subscriptions`, `unlockedEdits` conforme data-model.md
- [x] T008 Cliente/normalizador da federação Mapas em `lib/mapas.ts` (testado: 132 opps reais)
- [x] T009 Consolidar cliente Firecrawl (`/v2/scrape` JSON-mode + `/v2/agent`) em `lib/firecrawl.ts` — hoje a lógica vive dentro de `convex/enrich.ts`
- [x] T010 Serviço Gemini + prompts com bloco `<edital>` inerte + tipos da sabatina em `lib/gemini.ts`
- [x] T011 [P] Cliente AbacatePay REST (subscriptions/checkouts + `externalId` + devMode) em `lib/abacatepay.ts`
- [x] T012 [P] Camada Resend (envio único hoje, `batch.send` c/ Idempotency-Key quando escalar) em `lib/resend.ts` — extrair de `convex/alerts.ts`

## Phase 3: US1 — Radar de oportunidades (P1)

**Goal**: catálogo federado atualizado + feed filtrado por perfil.
**Independent test**: `convex run ingest:run` → `/oportunidades` lista reais com prazo futuro.

- [x] T013 [US1] `convex/opportunities.ts`: list/get/countBySource/upsert/setEnriched
- [x] T014 [US1] `convex/ingest.ts`: internalAction multi-fonte c/ falha isolada por fonte + sanitização de nulls
- [x] T015 [US1] `convex/enrich.ts`: scrape + Gemini → edital estruturado via `setEnriched`
- [x] T016 [US1] Feed `app/oportunidades/page.tsx` (fonte, prazo, valor, proponentes, categorias)
- [x] T017 [US1] `convex/discover.ts`: internalAction usando Firecrawl `/v2/agent` (`location:{country:"BR"}`) para instâncias bloqueadas (DF, MA) e editais municipais fora da rede → mesma `upsert`
- [x] T018 [P] [US1] Badge de (in)elegibilidade perfil×edital no feed — `personType`/`uf` vs `proponentTypes`/`enriched.eligibility` (FR-007)
- [x] T019 [P] [US1] Aviso "análise parcial" quando `enriched` ausente (edge case spec)
- [x] T020 [US1] Dedup cross-fonte: mesma oportunidade em 2 fontes → 1 card (normalizar por nome+prazo quando `externalId` difere, FR-003)

## Phase 4: US2 — Sabatina de banca (P2)

**Goal**: entrevista fundamentada no edital + parecer persistido.
**Independent test**: sabatinar qualquer oportunidade → parecer cita critério real.

- [x] T021 [US2] Rota `app/api/sabatina/route.ts` (contexto + histórico → reply/verdict)
- [x] T022 [US2] Chat + parecer em `app/sabatina/[id]/page.tsx`
- [x] T023 [US2] Rota `app/api/live-token/route.ts` (ephemeral token p/ voz)
- [x] T024 [US2] Persistir sessão em `sabatinaSessions` (turns + verdict) — mutation + hook no POST
- [x] T025 [US2] Botão "adicionar ao pipeline" pós-verdict → `pipeline.add` + `setSabatinaResult` gravando score/summary no card (FR-010)
- [x] T026 [US2] Checagem de inelegibilidade na abertura da sabatina (aviso upfront, FR aceita-se)
- [ ] T027 [P] [US2] Frontend de voz: conectar Live c/ token da T023 — **stretch, só após texto E2E**

## Phase 5: US3 — Pipeline + documentos + contatos (P3)

**Goal**: kanban persistente + docs c/ vencimento + contatos.
**Independent test**: mover card, cadastrar doc, reload → tudo persiste.

- [x] T028 [US3] `convex/pipeline.ts`: listForProfile (join opp) /add/move/setSabatinaResult/remove
- [x] T029 [US3] `convex/profiles.ts`: getByEmail/upsert/list
- [x] T030 [US3] Kanban 7 estágios em `app/pipeline/page.tsx`
- [x] T031 [P] [US3] `convex/documents.ts`: CRUD docs c/ `expiresAt` + query `expiringDocs(days)`
- [x] T032 [P] [US3] `convex/contacts.ts`: CRUD contatos por perfil
- [x] T033 [US3] Seção Documentos+Contatos em `app/pipeline/page.tsx` (ou `/documentos`) c/ badge "vence em Xd"
- [x] T034 [US3] "Marcar interesse" no feed → `pipeline.add` direto do card de oportunidade

## Phase 6: US4 — Alertas (P4)

**Goal**: email proativo deduplicado.
**Independent test**: `alerts:run` 2× → segundo run envia zero.

- [x] T035 [US4] `convex/alerts.ts`: match por área + `alertLog` dedup + Resend fetch
- [x] T036 [US4] Migrar envio p/ `lib/resend.ts` + dedup também p/ lembretes de prazo e docs
- [x] T037 [US4] Lembrete "≤3 dias p/ fechar" p/ itens do pipeline + "doc vencendo" (T031) no mesmo run
- [x] T038 [US4] `convex/crons.ts`: ingest diário + alerts diário
- [ ] T039 [US4] Fallback Vercel Cron (`app/api/cron/*`) se deploy Convex não sair — decidir após T005

## Phase 7: US5 — Cobrança Pix (P5)

**Goal**: paywall real + ativação via webhook.
**Independent test**: checkout sandbox pago → `profiles.plan` muda sozinho.

- [x] T040 [US5] `convex/billing.ts`: mutations p/ registrar `subscriptions`/`unlockedEdits` + query `planStatus`
- [x] T041 [US5] `app/api/webhooks/abacatepay/route.ts`: segredo verificado, eventos `subscription.completed|cancelled|trial_started` + `checkout.completed` avulso, idempotente (contracts/abacatepay-webhook.md)
- [x] T042 [US5] `app/assinatura/page.tsx`: planos R$49/490 e R$99/990 + destravar edital R$9,90 → `POST /subscriptions/create` e `checkouts/create` (methods `["PIX","CARD"]`)
- [x] T043 [US5] Paywall: 2ª sabatina no plano free → oferta plano/avulso (query `planStatus` + `unlockedEdits`)
- [ ] T044 [P] [US5] Auth WorkOS AuthKit via `npx workos@latest` substituindo email→perfil — **fase 2, após paywall funcionando**

## Phase 8: Polish & Cross-Cutting

- [ ] T045 Deploy Vercel público (demo no ar — requisito de submissão)
- [ ] T046 Dados de demo sintéticos p/ perfil/projeto + seed de vitrine (FR-018)
- [ ] T047 `npm audit` — resolver/justificar os 8 moderate do scaffold
- [ ] T048 Roteiro + gravação do vídeo 3 min (mercado → dor → demo ao vivo → Pix)
- [ ] T049 Tradução EN do README/vídeo (júri parcialmente não-PT)
- [ ] T050 Validação final: rodar `quickstart.md` inteiro + revisar spec p/ desvios

## Dependencies

```text
T005 (convex dev) → tudo que roda E2E
T007 (schema+) → T024, T040
T009/T011/T012 (libs) → T017, T041, T036
US1 → base de todas (feed existe)
US2 → T024/T025 dependem de T007
US3 → T031 antes de T037 (docs vencendo)
US5 → T040/T041 antes de T043
```

## Parallel examples

- `T011` + `T012` + `T018` + `T019` — libs e UI independentes
- `T031` + `T032` — CRUDs Convex independentes
- `T027` + `T044` — stretch goals em paralelo ao núcleo

## MVP sugerido

US1+US2 já demonstráveis hoje → fechar T005+T007+T024+T025+T034 entrega o
loop "radar → sabatina → pipeline" completo; US5 é o próximo salto de valor.
