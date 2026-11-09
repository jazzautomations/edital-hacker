# BOARD — o quadro do time

> Estado do time mora aqui, versionado com o código. Regras: cartão sem dono não existe; "peguei" se marca ANTES de começar; "pronto" só com teste verde do critério. Tasks detalhadas em `specs/001-ai-artist-manager/tasks.md` (T###).

## Roteiro do demo (o filtro do backlog)

> 60–90s na perspectiva do jurado. Vocabulário D014 (B.R.A.V.O.): Base→Repertório→Audiência→Venda→entrega Orientada. Medir em R$.

1. "R$15 bi em fomento + gigs privados — o coach organiza TODAS as fontes de renda da arte" → perfil do artista midstream (edital + gig)
2. Radar com dados reais → card "aceita você" + "máx 1 proposta" → entra na oportunidade
3. Sabatina (voz se Agora ok; texto = fallback garantido) → parecer 72/100 citando critério da rubrica real
4. Prospecção: agente caça casas de show na cidade → lead fecha → **vira gig com cachê** na agenda
5. Pipeline + doc vencendo dispara alerta; checkout Pix R$9,90 ao vivo
6. "O coach que todo trabalhador da arte pode pagar — o que mentoria de R$ milhares ensina, o agente faz todo dia"

## Grafo de dependência → ordem

```
✅ T005 convex dev → 110 opps reais no banco
✅ D011 prospecção MVP → leads+gigs deployados (E2E pendente de FIRECRAWL_API_KEY)
✅ D013 coach → agenda/cachês no ar
E2E sabatina/billing → precisa LLM_API_KEY + ABACATE_* no .env.local + convex env
T027 voz Agora → backend pronto, UI em progresso (subagente); precisa AGORA_*
T044 WorkOS → após paywall E2E
T045 deploy Vercel → após E2E
P001–P008 submissão → roteiro do vídeo em progresso (subagente)
```

Ordem: E2E (keys!) → voz UI → T044 → T045 → T046–T050

## A fazer

### ~~[T005] Convex dev real~~ ✅ FEITO
- Deploy: `keen-kangaroo-265.convex.cloud` (jazzautomations/edital-hacker)
- `ingest:run` rodou: **110 oportunidades reais** (MinC 64, CE 34, ES 10, GO 1, PA 1)
- Bugs expostos e corrigidos: Mapas manda `totalResource`/`categories` como string → normalização `toNum`/`toStrArray`; isolamento por registro; 4 fontes não respondem ao cloud Convex (PE/SE/MA/SPCultura) → Firecrawl discover cobre

### [E2E] Bateria end-to-end
- Dono: Devin
- Depende de: T005 ✅ + **keys** (LLM_API_KEY, FIRECRAWL_API_KEY, RESEND_API_KEY, ABACATE_*, AGORA_*)
- Pronto quando: `quickstart.md` inteiro roda — sabatina persiste, webhook ativa plano, alertas saem deduplicados
- ⚠️ Nota: env vars de Convex functions vão no **convex env** (`npx convex env set`), não só .env.local

### ~~[T051] Prospecção MVP~~ ✅ CÓDIGO FEITO (E2E pendente)
- `leads` table + `/prospeccao` + `discover.prospectLeads` (Firecrawl agent) + lead→gig
- Pronto de verdade quando: caçada real retorna leads com contato

### ~~[T052] Agenda & cachês~~ ✅ FEITO
- `gigs` table + `/agenda` (marcado→feito→pago, a-receber/recebido)

### [T053] Voz Agora
- Backend ✅ (`/api/voice-session` + `/api/voice-llm`, managed ASR/TTS/LLM)
- UI: em progresso (subagente) — `components/VoiceSabatina.tsx`
- Precisa: AGORA_APP_ID/CUSTOMER_ID/SECRET + túnel pública p/ voice-llm em dev

### [SQUAD] Divisão do time (proposta ao grupo 09/11)
- Laura → T044 auth + perfil | Asthri → filtros feed | AdminLTR → qualidade sabatina | Felipe → inscrição+vídeo | Devin → E2E+voz+crons

### ~~[T027] Mentor com voz (Gemini Live)~~ → virou T053 (Agora, D012)

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

- ~~T005~~ **destravado**: login feito via device-auth (link no cel), deploy `keen-kangaroo-265`, 110 opps no banco
- **Próximo**: `.env.local` com GEMINI/FIRECRAWL/RESEND/ABACATE keys → E2E completo da sabatina/billing
