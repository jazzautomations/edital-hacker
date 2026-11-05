# Data Model: Manager

Espelha `convex/schema.ts`. Campos `v.optional` → `?`.

## opportunities

Oportunidade cultural normalizada (edital, prêmio, residência, chamada).

| Campo | Tipo | Regra |
|---|---|---|
| source | string | identificador da fonte (baseUrl da instância ou slug do scraper) |
| sourceName | string | nome legível ("Mapa Cultural do Ceará") |
| externalId | string | id na fonte — **dedup por índice `by_source_external`** (FR-003) |
| name | string | título |
| shortDescription | string? | resumo da fonte |
| kind | string? | edital/prêmio/residência/gig (gig = roadmap) |
| registrationFrom / registrationTo | string? (ISO) | prazo de inscrição; feed só mostra `>= now` ou ausente (FR-005) |
| proponentTypes | string[] | PF/MEI/PJ/coletivo aceitos — vazio = todos |
| categories | string[] | áreas (música, audiovisual…) — match com `artAreas` do perfil |
| totalResource / vacancies | number? | valor e vagas quando divulgados |
| ownerName | string? | entidade promotora |
| sourceUrl | string | link oficial — sempre exibido (nunca inventar) |
| status | string | `open`/`closed` — índice `by_status` |
| rawMarkdown | string? | texto raspado do edital (dado inerte) |
| enriched | object? | **edital estruturado** — ver abaixo (FR-004) |
| lastSeenAt | number | heartbeat da ingestão |

`enriched`: `{ summary?, eligibility?, disqualifiers[], requiredDocs[], rubric[{criterion, weight?}], deadlines[{label, date}] }`

## profiles

| Campo | Tipo | Regra |
|---|---|---|
| name | string | nome artístico |
| email | string | **identidade única** — índice `by_email`; mesmo email = mesmo perfil (edge case) |
| personType | string | Pessoa Física / MEI / Pessoa Jurídica / Coletivo sem CNPJ |
| artAreas | string[] | match com `categories` (vazio = sem filtro) |
| uf / bio / portfolioUrl | string? | contexto do parecerista |
| plan | string | `free` / `manager` / `manager_pro` — setado pelo webhook Abacate |
| createdAt | number | |

## pipelineItems

| Campo | Tipo | Regra |
|---|---|---|
| profileId / opportunityId | id | índice `by_profile_opp` — um item por par |
| stage | string | `descoberta → interessado → inscrito → ganho → execucao → prestacao → arquivado` |
| notes | string? | |
| sabatinaScore | number? | 0–100, gravado por `setSabatinaResult` (FR-010) |
| sabatinaSummary | string? | resumo do parecer |
| updatedAt | number | histórico mínimo (FR-011) |

## contacts / documents

- `contacts`: profileId, name, role?, org?, email?, phone?, notes?
- `documents`: profileId, name, kind (certidão/portfólio/procuração…), expiresAt? (ISO) → alerta de vencimento (US4), storageId?

## alertLog

`{ profileId, opportunityId, sentAt }` — índice `by_profile_opp`; `unique()` antes de enviar = dedup garantido por escrita (FR-013).

## sabatinaSessions (a adicionar ao schema)

`{ profileId, opportunityId, turns[{role, text}], verdict{score, summary, gaps[], missingDocs[], warnings[]}, createdAt, completedAt? }` — persiste entrevista inteira, não só o resultado.

## subscriptions (a adicionar ao schema)

`{ profileId, abacateId ("subs_…"), checkoutId ("bill_…"), plan, cycle ("MONTHLY"|"ANNUALLY"), status ("ACTIVE"|"CANCELLED"|"PAST_DUE"), externalId, updatedAt }` — espelha objeto de assinatura AbacatePay; `externalId` nosso = `profileId` para reconciliação.

## unlockedEdits (a adicionar ao schema)

`{ profileId, opportunityId, checkoutId, paidAt }` — microtransação avulsa por edital (FR-014).

## Regras de validação

- `registrationTo` vencido nunca aparece como aberto (filtro no read).
- `totalResource: null` da API → `undefined` (validator rejeita null).
- Ingestão falha isolada por fonte: erro registrado, demais fontes seguem.
- `enriched` nunca inventa campos — ausente fica ausente e a UI marca "parcial".
