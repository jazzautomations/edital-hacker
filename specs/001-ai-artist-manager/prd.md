# PRD — Manager: o empresário de IA do artista independente

**Hack Brasil 2026 · Trilha: Cultura & Economia Criativa**
**Data**: 2026-11-05 · **Status**: em execução · **Repo**: github.com/jazzautomations/edital-hacker

## 1. Problema

O artista independente brasileiro não tem empresário — e isso custa dinheiro real:

- **32%** dos artistas dizem que a principal dificuldade da carreira é
  "encontrar um empresário" (Pesquisa Empresariamento Artístico, Anita
  Carvalho, série desde 2017).
- Booker humano cobra **15–20% por show**; empresário ~20–25% da renda —
  inacessível pra quem precisa de R$2–3k/mês pra sobreviver (46% dos músicos
  vivem só de música).
- **26% dos empresários ainda não têm contrato** com seus artistas — o
  mercado é informal até na formalização.
- Fomento público = **R$15 bilhões da PNAB** (Lei 14.399/22 + Lei
  12.132/25, até R$3bi/ano) + leis estaduais/municipais — mas o dinheiro
  chega **fragmentado em 5.570 municípios**, cada um com seu edital, seu
  site, seu formulário. 97% dos municípios aderiram à PNAB.
- Inscrições reprovam por **formalidade antes do mérito**: certidão vencida,
  orçamento fora do formato, anexo faltando.
- E quem ganha ainda pode perder tudo: prestação de contas reprovada →
  **CADIN**, devolução do recurso, impedimento de novos projetos.

A dor não é "falta criatividade" — é **burocracia + informalidade + falta de
representação**.

## 2. Mercado

### Tamanho

| Camada | Número | Fonte |
|---|---|---|
| Economia criativa BR | R$393 bi = 3,59% do PIB | Firjan 2025 |
| Mercado musical | R$116 bi/ano (R$94 bi ao vivo) | ANAFIMA "PIB da Música" 2024 |
| Fomento federal descentralizado | R$15 bi PNAB · ~R$3 bi/ano | Lei 14.399/22 + Lei 12.132/25 |
| Criadores/influencers BR | ~3,8 mi (maior mercado do mundo) | estudos creator economy |
| Artistas profissionais formais | ~1,26 mi | Firjan |

### Dinâmica chave (o porquê do produto existir)

1. **O dinheiro federou, a ferramenta não.** A PNAB descentralizou o fomento
   pros municípios — e nenhuma ferramenta cobre o long tail municipal. Os
   incumbentes cobrem ~59 editais (≈só o federal).
2. **O substituto real é humano e caro.** Concorrência não é software, é o
   booker de 15–20%. Qualquer SaaS &lt; R$100/mês é ordem de magnitude mais
   barato que a alternativa.
3. **Novos instrumentos = novas oportunidades.** Lei 14.903/24 criou 5
   instrumentos de fomento (execução, premiação, bolsa, ocupação, cooperação)
   — catálogo cresce em variedade, não só em volume.
4. **Demanda declarada.** Top-3 de aprendizado pedido por criadores BR
   (Visa/TikTok nov/2025): gestão financeira, negociação de contrato,
   estratégia empresarial — exatamente o que um "empresário" faz.

## 3. Concorrência

| Concorrente | Foco | Preço | Cobertura | Gap que deixa |
|---|---|---|---|---|
| Projeto Contemplado | escrever proposta c/ IA | R$19/edital · R$99–249/mês | ~59 editais (federal) | para na inscrição; sem CRM/banca/booking |
| Clube Emma | Rouanet/PNAB/ProAC | R$1.997/ano ecossistema | editais grandes | caro; sem cobertura municipal |
| CultureFlow | match + orçamento | até R$197/mês | 400+ monitorados | prestação só no Pro; sem banca simulada |
| Guria | docs/compliance B2G | prefeitura paga | B2G | artista depende da secretaria contratar |
| iauu / Gigz / By Booker | marketplace booking | R$29/mês+ | rede fechada | cold start de marketplace |
| AI managers gringos (Mogul, artistOS, ORBIT) | management | US$20–50/mês | EUA/UK | não sabem o que é edital, PNAB, Pix |
| **Booker/empresário humano** | tudo | **15–25%** | sua rede | preço e acesso |

**Posição**: único que une caça de dinheiro (editais federados + gigs) +
execução da burocracia (sabatina, docs) + CRM de carreira + agentic +
PT-BR + Pix.

## 4. Usuário e personas

**P1 — "MC Periferia" (primário)**: artista PF/coletivo, 18–30, periferia de
capital. Nunca viu um edital de perto; acha que "não é pra mim". Ganho:
descobre que existe dinheiro que aceita PF sem CNPJ. Métrica de sucesso:
primeira inscrição completada.

**P2 — "Produtor Formiga" (secundário)**: produtor cultural autônomo, MEI,
já perdeu edital por certidão. Ganho: pipeline + alerta de doc + prestação
de contas. Paga o plano Pro — é quem monetiza.

**P3 — "Artista Carreira"**: já vive de arte, quer escalar. Ganho: CRM +
contratos + split de cachê. Retenção anual.

## 5. Produto — jobs to be done

1. *"Me mostra o dinheiro que aceita gente como eu"* → Radar federado (132+
   opps hoje, ~45 fontes Mapas + agent p/ WAF/municípios).
2. *"Me prepara pra não passar vergonha na banca"* → Sabatina simulada com
   rubrica real, parecer 0–100, gaps, docs faltantes.
3. *"Segura minha burocracia"* → pipeline 7 estágios, docs c/ vencimento,
   contatos, alertas deduplicados.
4. *"Cobra barato e direito"* → Pix nativo: free radar, R$49/R$99 mensal,
   anual −17%, destrava-edital R$9,90.

**Explicitamente fora de escopo**: marketplace de gigs, ghost-writing de
proposta, marketing/engajamento (regra da trilha), app nativo.

## 6. Métricas (do hack e do produto)

- Cobertura: ≥100 opps abertas simultâneas, ≥5 fontes (SC-001) — **já: 132/6**
- Demo E2E &lt; 3 min (SC-007) — cabe no vídeo
- Parecer citando critério real do edital em 100% das sabatinas (SC-004)
- Zero alertas duplicados (SC-005)
- Checkout→plano ativo &lt; 3 min sandbox (SC-006)
- Produto (pós-hack): ativação free→sabatina &gt;25%; conversão avulso→assinatura &gt;15%

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Willingness-to-pay do segmento | free tier prova valor antes; âncora em dinheiro que entra ("esse edital vale R$50k"); R$9,90 avulso capta o desconfiado |
| Escopo excedente pro prazo | US1+US2 já demoáveis; resto em fases (tasks.md) |
| Instâncias fora do ar/WAF | falha isolada por fonte; Firecrawl agent p/ bloqueadas |
| "Ferramenta de edital" genérica | posicionamento = empresário/CRM, não "escreve edital"; sabatina e pipeline são a diferenciação |
| Júri achar pouco técnico | peso na ingestão federada + normalização heterogênea + agent + webhook idempotente |

## 8. Roadmap

- **Fase 0 (feito)**: ingestão federada, feed, sabatina, pipeline, billing
- **Fase 1 (até 30/nov)**: convex dev E2E, WorkOS auth, deploy, vídeo
- **Fase 2 (pós-hack)**: voz Gemini Live, prestação de contas (livro-caixa
  + nota→rubrica), contrato de show + split Pix, booking outreach tooling
- **Fase 3**: dados históricos de aprovados → match preditivo ("perfil X
  passou no edital Y"); API p/ secretarias publicarem

## 9. Narrativa pro vídeo (3 min)

1. (0:00–0:25) "Brasil tem R$15 bilhões em fomento cultural — descentralizados
   em milhares de municípios. O artista acha zero deles. Um booker cobraria 20%."
2. (0:25–1:40) Demo ao vivo: perfil → feed real → "aceita você" → sabatina →
   parecer 72/100 citando rubrica → pipeline.
3. (1:40–2:20) O moat técnico: 12 fontes federadas normalizadas, agent
   cobrindo WAF/municípios, alertas deduplicados.
4. (2:20–2:45) O Pix: checkout real R$9,90 destravando sabatina na tela.
5. (2:45–3:00) Visão: o primeiro empresário que todo artista BR pode pagar.
