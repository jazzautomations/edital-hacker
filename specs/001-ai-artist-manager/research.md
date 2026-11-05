# Research: decisões técnicas — Manager

Pesquisa executada 2026-11-05 contra documentação oficial dos patrocinadores
e dados ao vivo das fontes de editais. Cada decisão resolve um requisito da
spec — nenhuma integração é decorativa.

## Coleta de oportunidades (US1, FR-001..FR-004)

### Decisão: federação Mapas Culturais via API pública, com fallback Firecrawl

**Rationale**: a rede Mapas é open-source e ~45 instâncias brasileiras
(federal + ~15 estaduais + ~28 municipais) expõem a MESMA API REST sem
chave (`GET /api/opportunity/find`). Um único cliente ingere a federação
inteira — moat de cobertura que o concorrente direto (Projeto Contemplado,
~59 editais = só o federal) não tem.

**Medido ao vivo (5/nov)**: 6 instâncias saudáveis = **132 oportunidades
abertas** (MinC 64, Ceará 41, Pernambuco 15, ES 10, GO 1, PA 1). DF e
Maranhão respondem 403 (WAF); MT/MS/SPCultura fora do ar; Sergipe exigia
https (corrigido).

**Contexto de política (verificado)**: a PNAB (Lei 14.399/2022, ampliada
pela MPV 1.274/2024 → Lei 12.132/2025) destina **R$ 15 bilhões** a
estados/DF/municípios — até R$ 3 bi/ano, 97% dos municípios aderiram. O
artista NÃO acessa o MinC direto: acessa o edital do SEU município. A
Lei 14.903/2024 (marco regulatório) criou 5 instrumentos (execução,
premiação, bolsa, ocupação, cooperação cultural) = mais tipos de
oportunidade pra normalizar. A federação do produto espelha a federação
do dinheiro — esse é o argumento central do pitch.

**Alternativas consideradas**: scrapear tudo com Firecrawl (descartado como
fonte primária — a API é grátis e estruturada); apenas federal (descartado
— perde o argumento de cobertura municipal).

### Decisão: Firecrawl `/v2/agent` para fontes bloqueadas + `/v2/scrape` JSON-mode para enriquecimento

**Rationale**: `/agent` aceita `prompt` + JSON schema + `location: {country:
"BR"}` e acha editais municipais **sem URL conhecida** — cobre os sites de
prefeitura e instâncias com WAF que a API não alcança. Para URL conhecida,
`/scrape` com `formats: [{type:"json", schema}]` é mais barato e síncrono.
`/extract` está deprecado em favor de `/agent`.

**Alternativas consideradas**: `/extract` (legado); crawler próprio com
Playwright (custo de manutenção alto demais pro prazo).

### Normalização Mapas (campos reais verificados)

`id`, `name`, `shortDescription`, `longDescription`,
`registrationFrom`/`registrationTo` (`{date, timezone}` → ISO + `-03:00`),
`registrationProponentTypes`, `registrationCategories`,
`registrationRanges`, `totalResource` (pode ser `null` → `undefined`),
`vacancies`, `site`, `owner.{id,name}`, `status` (1=aberta). URL pública:
`{baseUrl}/oportunidade/{id}/`. Filtros server-side: `status=EQ(1)`,
`registrationTo=GTE(now())`.

## Sabatina de banca (US2, FR-008..FR-010)

### Decisão: Gemini 3 Flash via `@google/genai`, JSON mode com schema

**Rationale**: turnos de entrevista precisam de raciocínio + voz PT-BR
natural na versão Live. Saída estruturada (`responseMimeType:
"application/json"` + schema de parecer) elimina parser frágil — aprendizado
do protótipo anterior que precisava de JSON-repair.

### Decisão: voz via Gemini Live com `authTokens` efêmeros (stretch)

**Rationale**: `ai.authTokens.create()` emite token de uso único com
constraints (modelo, config) embutidos — o browser conecta direto no
WebSocket do Live sem expor a chave permanente. Satisfaz constituição III.
Rota `app/api/live-token/route.ts` já implementa o padrão; frontend de voz
é incremento após o MVP de texto.

**Alternativas consideradas**: WebSocket proxy servidor→Live (latência e
complexidade maiores); expor chave ao client (viola constituição III).

### Anti-injeção (constituição II)

System prompt do parecerista delimita o conteúdo do edital em bloco de dados
(`<edital>`), instrui a ignorar comandos embutidos e reportar instruções
suspeitas no campo `warnings` do parecer — virando a defesa em feature
demonstrável.

## Alertas (US4, FR-013)

### Decisão: Resend — envio único por perfil hoje, `batch.send` quando escalar

**Rationale**: `resend.batch.send` aceita até 100 emails/chamada com
`Idempotency-Key` — mas o padrão atual (1 email consolidado por perfil
listando N oportunidades) já minimiza volume e spam. Deduplicação por
registro `alertLog` (perfil+oportunidade) garante FR-013. `scheduledAt`
aceita linguagem natural/ISO — usável para lembrete de prazo exato.

**Alternativas consideradas**: cron por oportunidade com email separado
(spamy); push/webhook (fora de escopo).

## Pagamentos (US5, FR-014..FR-015)

### Decisão: AbacatePay subscriptions + checkouts em devMode

**Modelo mental (doc oficial)**: `POST /subscriptions/create` cria um
**checkout** (`bill_`), não a assinatura. A assinatura (`subs_`) só existe
após pagamento — confirmar via webhook `subscription.completed`, não pela
resposta do create. Produto precisa ter `cycle` (MONTHLY/ANNUALLY) na loja;
`trialDays` 1–90 nativo; `retryPolicy` (maxRetry 1–10, retryEvery dias)
rebaixa plano automaticamente após esgotar tentativas → satisfaz FR-015.

**Pix**: assinatura por Pix usa Pix Automático (mandato) — cupons não
aplicam. A microtransação avulsa por edital usa `POST /checkouts/create`
comum com `methods: ["PIX"]` e `externalId` = profileId+opportunityId.

**Alternativas consideradas**: Stripe (não é patrocinador, Pix nativo é
pior); cobrança manual via QR (sem webhook = viola FR-015).

## Auth (FR-014, fase 2)

### Decisão: WorkOS AuthKit via `npx workos@latest` (CLI installer)

**Rationale**: o CLI provisiona ambiente e integra AuthKit no Next.js
automaticamente — zera a tarefa chata de auth sem desvio de arquitetura.
MVP usa email→perfil (identidade leve, constituição I); AuthKit entra antes
da submissão se houver tempo.

## Agendamento (FR-001, FR-013)

### Decisão: Convex crons (`crons.ts` já definido)

Ingest diário + varredura de alertas + checagem de prazos/documentos.
Depende de `npx convex dev` com login para deploy — alternativa documentada:
Next API route + Vercel Cron se o deploy Convex não sair a tempo.

## LLM para enriquecimento (FR-004)

### Decisão: Gemini com schema de edital estruturado sobre markdown do Firecrawl

Scrape → markdown → Gemini extrai `{summary, eligibility, disqualifiers[],
requiredDocs[], rubric[], deadlines[]}` com JSON mode. Conteúdo dentro de
bloco `<edital>` (constituição II). Fallback: sem `FIRECRAWL_API_KEY`,
usa `longDescription` da API Mapas como fonte do digest.

## Alternativas macro rejeitadas

- **Marketplace de gigs** (Gigz/iauu já existem e morrem de cold start) →
  produto single-player; booking vira roadmap.
- **Escrever a proposta pela artista** → posicionamento deliberado é
  "preparar", não "ghost-write"; diferencia de todos os concorrentes e
  casa melhor com o júri técnico.
