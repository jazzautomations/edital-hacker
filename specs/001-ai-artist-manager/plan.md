# Implementation Plan: Manager — Empresário de IA para Artistas Independentes

**Branch**: `001-ai-artist-manager` | **Date**: 2026-11-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-ai-artist-manager/spec.md`

## Summary

Produto web em que um agente de IA atua como empresário do artista
independente brasileiro: (1) radar federado que ingere e normaliza
oportunidades culturais de 12+ fontes oficiais (rede Mapas Culturais via API
pública + fontes bloqueadas/fora da rede via Firecrawl), (2) sabatina de
banca simulada via LLM que entrevista o artista contra a rubrica real do
edital e emite parecer com nota/gaps/documentos, (3) CRM de carreira
(pipeline kanban, documentos com vencimento, contatos), (4) alertas por
email deduplicados, (5) monetização Pix com assinatura e microtransação por
edital. Stack única Next.js + Convex com integrações de patrocinadores
resolvendo requisitos reais da spec (não decorativas).

## Technical Context

**Language/Version**: TypeScript 5 / Node 22, React 19

**Primary Dependencies**: Next.js 16 (App Router, Turbopack), Convex 1.x
(DB + queries/mutations/actions + crons), LLM OpenAI-compatível via `lib/llm.ts` (sabatina/enriquecimento;
voz 100% Agora managed — ASR+LLM+TTS),
Firecrawl `/v2/agent` + `/v2/scrape` (coleta fora da rede Mapas), Resend
(batch/scheduled emails), AbacatePay REST (subscriptions + checkouts +
webhooks, devMode), WorkOS AuthKit (auth — fase 2)

**Storage**: Convex (document DB) — schema já definido em `convex/schema.ts`

**Testing**: verificação funcional end-to-end (`quickstart.md`); `next
build` + `tsc --noEmit` como gate mínimo; sem suíte de testes unitários no
escopo do hack (cobertura manual dos fluxos críticos)

**Target Platform**: Web (Vercel/local), PT-BR, responsivo

**Project Type**: web-service + agent pipelines (Next.js app + Convex
functions + Next API routes para LLM/webhooks)

**Performance Goals**: ingestão diária de 100+ oportunidades < 5 min;
sabatina com resposta < 10s por turno; feed com dados realtime via
subscrição Convex

**Constraints**: chaves somente em servidor; conteúdo raspado = dado
inerte; sandbox AbacatePay durante o evento; 0 dados pessoais reais

**Scale/Scope**: MVP single-player (sem marketplace); ~132 oportunidades
vivas hoje, crescendo com fontes novas; usuários de demo = dezenas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Nota |
|-----------|--------|------|
| I. Demo-first | ✅ | Escopo fatiado em 5 user stories independentemente demonstráveis |
| II. Conteúdo = dado | ✅ | Prompt do parecerista isola conteúdo do edital em seção de dados; extração Firecrawl não executa instruções da página |
| III. Segredos no servidor | ✅ | LLM/Firecrawl/Resend/Abacate só em API routes e Convex actions; Live usa `authTokens` efêmeros |
| IV. Sem promessa de aprovação | ✅ | FR-017; parecer inclui disclaimer fixo |
| V. Semântica hackathon | ✅ | Repo criado 5/nov, histórico novo, código 100% novo |

**Gate: PASS** — nenhuma violação.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-artist-manager/
├── plan.md              # este arquivo
├── research.md          # decisões técnicas (Phase 0)
├── data-model.md        # entidades e validações (Phase 1)
├── quickstart.md        # validação end-to-end (Phase 1)
├── contracts/           # contratos HTTP/LLM (Phase 1)
│   ├── sabatina.md
│   ├── live-token.md
│   └── abacatepay-webhook.md
└── tasks.md             # ($speckit-tasks)
```

### Source Code (repository root)

```text
app/
├── page.tsx                  # landing
├── providers.tsx             # ConvexProvider
├── oportunidades/page.tsx    # feed (US1)
├── sabatina/[id]/page.tsx    # entrevista + parecer (US2)
├── pipeline/page.tsx         # kanban (US3)
├── assinatura/               # checkout/plano (US5) — a criar
└── api/
    ├── sabatina/route.ts     # turno da entrevista (LLM, server-side)
    ├── voice-session/route.ts  # sobe o agente Agora
    ├── webhooks/abacatepay/  # confirmação de pagamento (US5) — a criar
    └── cron/                 # alternativa p/ crons sem Convex dev — avaliar

convex/
├── schema.ts                 # tabelas (ver data-model.md)
├── opportunities.ts          # list/get/upsert/setEnriched
├── profiles.ts               # CRUD perfil + plan
├── pipeline.ts               # kanban + setSabatinaResult
├── contacts.ts / documents.ts# CRM auxiliar — a criar
├── ingest.ts                 # internalAction: varredura Mapas
├── discover.ts               # internalAction: Firecrawl /agent p/ fontes fora da rede — a criar
├── enrich.ts                 # internalAction: scrape + LLM → edital estruturado
├── alerts.ts                 # internalAction: match + Resend batch
├── billing.ts                # internalAction/mutations: checkout + status plano — a criar
└── crons.ts                  # ingest diário + alertas + deadlines

lib/
├── mapas.ts                  # cliente/normalizador da federação Mapas
├── firecrawl.ts              # scrape + agent (a consolidar do enrich.ts)
├── llm.ts                    # chat OpenAI-compat; lib/llm.ts no app
├── abacatepay.ts             # cliente REST subscriptions/checkouts — a criar
├── resend.ts                 # envio batch + templates — a consolidar
└── types.ts                  # tipos de domínio (espelho do schema)
```

**Structure Decision**: single Next.js app com backend Convex; rotas HTTP
Next apenas onde Convex não alcança (webhooks externos, streaming LLM com
controle fino, emissão de token efêmero). Convex guarda toda a verdade de
domínio; Next renderiza e expõe bordas.

## Complexity Tracking

Sem violações de constituição — seção vazia de propósito.
