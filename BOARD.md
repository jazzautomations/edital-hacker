# BOARD — o quadro do time

> Estado do time mora aqui, versionado com o código. Regras: cartão sem dono não existe; "peguei" se marca ANTES de começar; "pronto" só com teste verde do critério. Tasks detalhadas em `specs/001-ai-artist-manager/tasks.md` (T###).

## Roteiro do demo (o filtro do backlog)

> 60–90s na perspectiva do jurado. Só entra no board o que aparece aqui ou sustenta o que aparece.

1. "R$15 bi em fomento descentralizado — o artista acha zero" → abre o feed com dados reais
2. Card "aceita você" + "máx 1 proposta" → entra na oportunidade
3. Sabatina: parecerista entrevista contra rubrica real → parecer 72/100 citando critério
4. Card cai no pipeline com a nota; doc vencendo dispara alerta
5. Checkout Pix R$9,90 destravando sabatina ao vivo
6. "O primeiro empresário que todo artista pode pagar"

## Grafo de dependência → ordem

```
T005 convex dev → tudo E2E (T039 decide depois)
T027 voz → só após texto E2E verde (T021/T022/T024 ✅)
T044 WorkOS → após paywall E2E
T045 deploy → após T005+T044
P001–P008 submissão → paralelo ao build desde já
```

Ordem: T005 → E2E checks → T027 → T044 → T045 → T046–T050

## A fazer

### [T005] Convex dev real (BLOQUEIO P0)
- Dono: **Muniz** (login humano) + Devin (resto)
- Pronto quando: `npx convex dev` conecta, `_generated` real substitui stubs, `ingest:run` roda e o feed mostra dados vivos

### [E2E] Bateria end-to-end
- Dono: Devin
- Depende de: T005
- Pronto quando: `quickstart.md` inteiro roda — sabatina persiste, webhook ativa plano, alertas saem deduplicados

### [T027] Mentor com voz (Gemini Live)
- Dono: Devin
- Depende de: E2E verde
- Pronto quando: sabatina falada funciona — token efêmero → WebSocket → áudio, com modelo travado por constraint

### [T044] Auth WorkOS AuthKit
- Dono: Devin · `npx workos@latest`
- Depende de: E2E verde
- Pronto quando: login real substitui perfil "demo"; perfis por usuário autenticado

### [T045] Deploy público (Vercel + Convex prod)
- Dono: Devin
- Depende de: E2E + T044
- Pronto quando: link estável, demo carrega sem login, env vars em produção

### [T046] Dados de demo sintéticos + seed
- Dono: Devin
- Pronto quando: perfil/projeto fake bonitos; FR-018 — zero dado pessoal real

### [T047] npm audit — resolver/justificar 8 moderate
- Dono: Devin

### [T039] Decisão fallback cron (Vercel Cron) — se T005 travar
- Dono: Devin · condicional

### [V01] Validação concierge — oferta + 15-20 artistas a R$9,90
- Dono: Muniz (rede) + Devin (texto da oferta, parecer)
- Pronto quando: ≥5 respostas reais; conversão registrada em DECISOES.md

### [P001] Workstream submissão — roteiro do vídeo por critério da rubrica
### [P002] Gravação incremental de clipes (B-roll conforme features mergem)
### [P003] Texto de submissão + descrição no painel
### [P004] README/descrição EN (T049 — júri parcialmente não-PT)
### [P005] Backup local do vídeo + conta reserva de demo
### [P006] Q&A + sabatina de jurado (playbook pitch)
### [P007] Upload da submissão com folga (≠30/nov 23h)
### [P008] Ensaio da final presencial (caso finalista)

## Fazendo

<!-- cartões em execução -->

## Pronto (aguardando merge)

## Feito

- T001–T004 scaffold + repo público + types
- T006–T012 schema completo + libs (mapas/firecrawl/gemini/abacate/resend)
- T013–T020 US1: ingest federado 132 opps reais + feed + elegibilidade + dedup + registrationLimitPerOwner
- T021–T026 US2: sabatina persistida + parecer no pipeline + live-token c/ constraints + inelegibilidade upfront
- T028–T034 US3: kanban + docs/contatos + marcar interesse
- T035–T038 US4: alertas 3 tipos deduplicados + crons (ingest+alerts+enrich+discover)
- T040–T043 US5: billing + webhook idempotente + /assinatura + paywall
- D001–D010 registradas · CONTEXTO.md · red team na proposta · PRD · spec-kit completo · analyze

## Travado / ajuda

- **T005 travado**: precisa do login Convex do Muniz — bloqueia todo E2E. Há ~3h. DESTRAVAR HOJE.
