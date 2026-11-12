# Manager — o empresário de IA do artista independente

**Hack Brasil 2026 · Trilha: Cultura & Economia Criativa**

O artista independente brasileiro não tem empresário — 32% dizem que a maior
dificuldade da carreira é encontrar um (Pesquisa Empresariamento Artístico,
Anita Carvalho). Enquanto isso, o fomento público fica atrás de burocracia, e um booker
humano cobra 15–20% de cada show.

Manager é o empresário que cabe no bolso: um agente que encontra as
oportunidades que aceitam você (editais, prêmios, residências, gigs), sabatina
sua proposta como uma banca de verdade, organiza seu pipeline de carreira e
cobra uma fração da comissão humana — via Pix.

**No ar:** https://editalhacker.jazzautomations.com.br

## O que o artista faz aqui

1. **Cria o perfil em 1 minuto** (área, estado, como se inscreve em edital) e
   entra com um código de 6 dígitos no e-mail. Sem senha.
2. **Radar de editais**: os abertos, lidos todo dia de portais federais,
   estaduais e municipais, ordenados pelo que combina com o perfil, com o
   motivo em cada um ("tua área", "no teu estado", "aceita MEI"). Busca e
   filtro por área, estado, prazo e valor.
3. **Sabatina de banca**: um parecerista simulado entrevista o artista com os
   critérios do edital e devolve nota de 0 a 100, nota por critério, o que
   arrumar e os documentos que faltam. Por texto ou por voz.
4. **Pipeline**: cada edital na sua etapa, do "vou inscrever" à prestação de
   contas, com prazo e nota da banca.
5. **Prospecção**: um agente pesquisa quem contrata na cidade (casas, festivais,
   escolas, marcas) e traz com contato. Daí sai a abordagem por e-mail ou
   WhatsApp, a proposta e o contrato em PDF.
6. **Agenda e cachês**: quanto tem a receber, o que atrasou, calculadora de piso
   de cachê e roteiro do ECAD em planilha.
7. **Documentos**: upload de certidões, portfólio e contratos, com validade,
   aviso antes de vencer e a lista do que quase todo edital exige.
8. **Coach**: conversa em português normal que executa ("anota que sexta toco
   no Bar do Zé por R$ 1.500").
9. **Rider técnico, press kit público e relatório de prestação de contas** em
   PDF.

Grátis: radar e a primeira sabatina. Depois, R$ 9,90 por edital no Pix ou
plano mensal/anual. Sem comissão sobre cachê.

## Stack

Next.js 16 (App Router, Cache Components) · Convex (banco, arquivos, rotinas
agendadas) · LLM com fallback entre provedores (Gemini → Groq → OpenAI) ·
Agora Conversational AI (voz) · Firecrawl (leitura de editais e prospecção) ·
Resend (código de entrada e avisos) · AbacatePay (Pix e assinatura) ·
WorkOS AuthKit (login por conta) · Composio (Gmail e Google Agenda)

## Rodar local

```bash
cp .env.example .env.local   # preencha as chaves
npx convex dev               # gera NEXT_PUBLIC_CONVEX_URL e os tipos
npx convex run ingest:run    # puxa os editais abertos
npm run dev
```

## Segurança e dados

- Entrada por código no e-mail; no banco ficam só hashes do código e da sessão.
- O perfil só é entregue pra sessão válida. O press kit público mostra só o que
  o artista expõe pra contratante.
- Retornos de serviços externos (agente de voz, webhooks) são assinados.
- O usuário apaga cada documento e a conta inteira pelo próprio app.
- Detalhes em [/privacidade](https://editalhacker.jazzautomations.com.br/privacidade).

## Regras do hack

Repositório criado em 05/nov/2026 (após a abertura). Todo o código é novo —
o conceito é continuação de uma ideia anterior, nenhum código pré-evento foi
copiado, conforme itens 6.1 e 6.2 do Regulamento.
