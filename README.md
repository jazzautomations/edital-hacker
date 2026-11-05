# Manager — o empresário de IA do artista independente

**Hack Brasil 2026 · Trilha: Cultura & Economia Criativa**

O artista independente brasileiro não tem empresário — 32% dizem que a maior
dificuldade da carreira é encontrar um (Pesquisa Empresariamento Artístico,
Anita Carvalho). Enquanto isso, R$ 2,4 bilhões por ano em fomento público ficam
atrás de burocracia, e um booker humano cobra 15–20% de cada show.

Manager é o empresário que cabe no bolso: um agente que encontra as
oportunidades que aceitam você (editais, prêmios, residências, gigs), sabatina
sua proposta como uma banca de verdade, organiza seu pipeline de carreira e
cobra uma fração da comissão humana — via Pix.

## Como funciona

1. **Radar** — ingere oportunidades de 12+ instâncias da rede Mapas Culturais
   (federal + estaduais + municipais) via API pública; enriquece cada edital
   com Firecrawl + Gemini em um schema estruturado (elegibilidade,
   desclassificadores, documentos, rubrica, prazos).
2. **Sabatina de banca** — um parecerista simulado entrevista o artista contra
   a rubrica real do edital e devolve score 0–100, gaps e documentos faltantes.
   (Voz em tempo real via Gemini Live + ephemeral tokens é o stretch goal.)
3. **CRM de carreira** — pipeline kanban: descoberta → interessado → inscrito →
   ganho → execução → prestação de contas. Contatos, documentos, alertas por
   email (Resend) quando abre edital que aceita seu perfil.
4. **Monetização** — free tier (radar) → R$49/mês (sabatina + CRM) →
   R$99/mês (prestação de contas + contratos) → microtransação Pix por edital.
   Checkout via AbacatePay (assinaturas nativas).

## Stack

Next.js 16 · Convex (DB + crons de ingestão/alertas) · Gemini 3 Flash +
Gemini Live · Firecrawl · Resend · AbacatePay · WorkOS (auth, fase 2)

## Setup

```bash
cp .env.example .env.local   # preencha as chaves
npx convex dev               # gera NEXT_PUBLIC_CONVEX_URL + types
npx convex run ingest:run    # puxa editais abertos das 12 fontes
npm run dev
```

## Regras do hack

Repositório criado em 05/nov/2026 (após a abertura). Todo o código é novo —
o conceito é continuação de uma ideia anterior, nenhum código pré-evento foi
copiado, conforme itens 6.1 e 6.2 do Regulamento.
