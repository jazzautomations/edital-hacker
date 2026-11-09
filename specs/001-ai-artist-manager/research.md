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

**Descobertas API (verificado ao vivo)**:
- `evaluationMethodConfiguration` retorna só um ID — entidade sem endpoint
  público. Rubrica/critérios reais exigem a página do edital (Firecrawl
  enrich é requisito, não opcional).
- Fases são oportunidades-filhas: `GET /api/opportunity/find?parent=EQ(id)`
  retorna nome+datas+status das fases (resultado, recurso etc.) — fonte
  estruturada de "datas-chave" sem scraping (enriquecimento futuro).
- `registrationLimitPerOwner` (máx. propostas por proponente) é campo
  selecionável → normalizado no schema, vira tag de atenção no feed —
  desclassificador real direto da API.
- `describe` expõe ~100 campos; `longDescription` vem nulo (conteúdo mora
  na página), `registrationSteps`/`registrationRanges` são IDs de entidade.

**Teardown Projeto Contemplado (site verificado)**: mais forte que a
estimativa — 59 editais abertos incluindo **internacionais** (Royal
Drawing School, Fondation François Schneider), ficha de IA por edital,
filtro de elegibilidade PF/MEI/PJ/ONG/coletivo+UF, taxonomia por tipo de
instrumento (ocupação/fomento/incentivado ≈ Lei 14.903), email de novos
editais, magic-link auth, mesma honestidade ("a IA não garante"). Preços:
grátis 1 inscrição/mês · R$19 avulso · R$99/mês · R$249/mês Estúdio.
**Gaps que permanecem**: para na exportação da proposta (zero pipeline/
CRM/prestação), sem banca simulada (eles escrevem POR você; nós
stress-testamos CONTRA você), cobertura curada e não federada
automatizada. Implicação: a demo não pode abrir no feed (paridade) —
abre na sabatina + pipeline.

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

### Decisão (atualizada): LLM OpenAI-compatível via `lib/llm.ts` — Gemini removido

**Rationale**: turnos de entrevista precisam de raciocínio + voz PT-BR
natural na versão Live. Saída estruturada (`responseMimeType:
"application/json"` + schema de parecer) elimina parser frágil — aprendizado
do protótipo anterior que precisava de JSON-repair.

### Decisão (atualizada): voz via Agora managed (ASR+LLM+TTS) — Gemini Live descartado

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

### Decisão (atualizada): LLM agnóstico com schema de edital sobre markdown do Firecrawl

Scrape → markdown → LLM extrai `{summary, eligibility, disqualifiers[],
requiredDocs[], rubric[], deadlines[]}` com JSON mode. Conteúdo dentro de
bloco `<edital>` (constituição II). Fallback: sem `FIRECRAWL_API_KEY`,
usa `longDescription` da API Mapas como fonte do digest.

## Alternativas macro rejeitadas

- **Marketplace de gigs** (Gigz/iauu já existem e morrem de cold start) →
  produto single-player; booking vira roadmap.
- **Escrever a proposta pela artista** → posicionamento deliberado é
  "preparar", não "ghost-write"; diferencia de todos os concorrentes e
  casa melhor com o júri técnico.

---

# Landscape competitivo (pesquisa 08/dez, fontes primárias de pricing)

**Tese validada com nuance**: ninguém no mundo — e menos ainda no Brasil —
junta num agente só radar de editais + sabatina interativa + prospecção de
leads comerciais + agenda de cachês + EPK/contrato/rider + prestação de
contas + digest. Mas o pitch "ninguém faz isso" exige precisão: já existe
ecossistema parcial dos dois lados.

## Os 3 concorrentes mais perigosos + respostas

| Concorrente | O que tem | O que falta | Nossa resposta |
|---|---|---|---|
| **Clube Emma** (clubemma.com.br) | match+escrita+"modo parecerista"+EmmaPresta (prestação de contas)+Emmatrocínio | R$700–4.000/ano infoproduto; parecerista revisa o texto que ela mesma escreveu; zero renda privada (gigs/cachês/leads) | "Emma escreve seu projeto; a gente empresaria sua carreira." Sabatina *interroga* o artista (e em voz — ninguém tem) |
| **Projeto Contemplado** (projetocontemplado.com.br) | radar "aceita você" + IA lê edital + escreve junto; freemium | termina na inscrição — copiloto por-edital, sem pipeline permanente/docs/cachês | "De assistente de inscrição a empresário permanente." |
| **By Booker** (bybooker.com, João Pessoa) | DPK+agenda pública+financeiro de cachê+rider/contrato+marketplace | só música ao vivo; lead **passivo** (marketplace); zero editais/fomento | Renda mista real (edital+gig+aula+patrocínio) + agente que **sai prospectar** (Firecrawl) |

## Menções para Q&A do júri

- **OCTVE** (octve.io, $50/mo): prova global do modelo "workspace do negócio
  do artista" — zero Brasil/fomento, 5–10× nosso preço.
- **RadarEdital / FAROL / Edital Cultural**: radar = feature commoditizada
  (deve ser grátis mesmo). FAROL tem "Sonda" (alerta por projeto descrito) —
  benchmark de cobertura: medir se nossos 110+ editais/6 fontes superam.
- **MNGRS.AI** (€29,99/mo): claim "1º AI artist manager" — é marketing de
  release, excluído pela trilha (5.2), em EUR.
- **Audo** (career coach genérico): descontinuado ~set/2026 — dado de que
  coach genérico morre; verticalização profunda é a resposta.
- **Capivarafy** (patrocinadora): validação do mercado, não concorrente.
- ⚠️ Colisão de nome: radaredital.com.br é produto de licitações PNCP B2B —
  não usar "Radar Edital" como nome.

## Diferencial defensável (ordem de força)

1. **Duas rendas num pipeline só**: fomento público E trabalho privado —
   ninguém cruza.
2. **Sabatina como treino** (interrogação interativa, por voz, citando
   rubrica real) vs. revisão de documento.
3. **Agente pró-ativo**: digest, alertas multi-canal (email+WA+SMS+voz),
   monitor Firecrawl contínuo vs. ferramentas passivas.
4. **Preço Pix/microtransação** (R$9,90 avulso) vs. R$700–4.000/ano.
5. **Moat de dados**: histórico pipeline+docs+pareceres que nenhum
   agregador gratuito acumula.

## Ação tática sugerida

Cadastrar conta grátis em FAROL + RadarEdital + Projeto Contemplado no dia
da demo prep para medir cobertura real (SC-001 mira 100+ editais/5+ fontes).

---

# Dores reais dos trabalhadores da arte (pesquisa 08/dez, 30+ fontes primárias)

## Números que enquadram o pitch

- **2,7 mi** de trabalhadores criativos informais; 47,3% dos CNPJs de música
  são MEI (ANAFIMA — música = R$116 bi/ano)
- **Autoempresariado fatura R$600/mês vs. R$18.500/mês com escritório**;
  71,4% dos escritórios faturam >R$20k vs. 36,4% dos independentes
  (Pesquisa Empresariamento Artístico/Anita Carvalho 2021) — *o argumento
  central: o coach é o "escritório" que o artista não pode pagar*
- Ranking de dores (Vortex/Abramus, 1.250 inscritos): divulgação 38% ·
  gestão/estratégia 22% · networking 21% · shows 21% · renda 21% —
  **e 62% já têm 5+ anos de carreira** (não é problema de novato)
- **63/83 projetos indeferidos** no Linc Sorocaba — 43 por certidão de
  contador que o edital nem explicava (morte por formalidade, não mérito)
- 35,5% dos criativos temem que IA substitua seu emprego (Deck 2025/26)

## A dor #1 transversal: DINHEIRO QUE NÃO ENTRA

Calote de prefeitura (Carnaval BH ~100 trabalhadores 2 meses sem pagar),
atraso institucionalizado ("no próximo mês a gente compensa"), cachê de
R$60/banda ("tem outra banda na fila"), pay-to-play. Edital: juridiquês +
plataforma quebrada + órgão que não responde → desistência antes da
inscrição. Quem ganha pode perder: prestação não feita → dívida ativa
(Secel-MT notificou 44).

## O que já pagam (âncoras de preço)

| Solução atual | Preço | O que odeiam |
|---|---|---|
| Empresário/booker | 15–25% do cachê | caro, só pega quem já tem público, cobra % sem trazer show |
| Mentoria "viver de música" | R$2.416+ (Hotstage) | infoproduto genérico, "já fui queimado" |
| Elaboração de projeto | R$1.200 + 8–10% do captado | escreve POR você — não te prepara |
| Assessoria de imprensa | R$1.200–4.800/mês; EPK avulso R$500 | fora do orçamento |
| Superprof/Getninjas | lead pago ou taxa no ALUNO | taxa sem entregar aluno de verdade |

## Linguagem real para copy

"cachê" · "trampo" · "fazer um corre" · "fechar o mês" · "quem tem QI tem
tudo" · "agenda cheia ≠ bolso cheio" · "bebida não é cachê" · "pagar pra
tocar" · "no próximo mês a gente compensa" · "cara de paisagem" ·
"1/2 portaria" · "aula dada, aula paga" · "pejotizado"
❌ evitar: "empoderamento", "jornada", "ecossistema"

## Objeções a IA + antídotos (design)

1. "Robô não sabe como é a cena aqui" → coach cita rubrica real do edital,
   nomes de leads e cachês do próprio histórico
2. "ChatGPT de graça já dá conselho genérico" → conselho específico com
   dados da carreira (RAG) > genérico
3. "IA na música é embuste" (campanha UBC "quem usa paga") → "a IA não cria
   contigo — faz a parte que nenhum artista gosta: edital, doc, cobrança";
   dados do usuário nunca treinam modelo
4. "Já paguei curso que prometia viver de música" → prova antes de pagar:
   radar grátis + sabatina R$9,90 avulsa
5. Técnico/produtor se sente invisível ("quem monta o palco também é
   trabalhador da arte") → linguagem de backoffice/diária inclui metade da
   cadeia que "app de artista" exclui

## Casos de uso matadores por persona

- **Músico/banda**: cachê piso por tipo de gig + pacote com sinal + edital
  que aceita PF
- **DJ/produtor**: regra de cancelamento/sinal (data de DJ é "estoque" —
  sábado cancelado = fim de semana perdido)
- **Professor**: política de falta/reposição pronta pro WhatsApp do aluno +
  precificação por custo real (particular R$91,82/h vs. pejotizado R$21,81/h)
- **Técnico/produção**: pipeline de docs + livro-caixa de prestação +
  alerta de recebimento (o calote institucional documentado)
