# P001 — Roteiro do vídeo de submissão (≤3:00) — Hack Brasil 2026

**Trilha**: Cultura & economia criativa · **Produto**: Manager — coach de IA dos trabalhadores da arte
**Premissa do formato**: o júri online NÃO testa o app — o vídeo é a prova inteira de execução. Desempate oficial = execução técnica primeiro → a demo funcionando ocupa o maior bloco.
**Jurados prováveis (vocabulário D014)**: Thiago Kiss (videomaker — estética é nota escondida; "seja teu próprio empresário"), Jacques Figueras (produtor 2×Grammy — método B.R.A.V.O.: Base, Repertório, Audiência, Venda, entrega Orientada).
**Persona da demo (sintética, FR-018)**: **Lia Moura** — cantora e compositora, MEI, Belo Horizonte. Artista *midstream*: mistura edital + gig privado. Os dados dela são fake; as oportunidades são todas reais.

**Regras de copy respeitadas** (checklist antes de exportar):
- [x] Tudo medido em R$ (fomento, cachê, comissão, preço)
- [x] "Preparar, não escrever" é o diferencial dito em voz alta
- [x] PROIBIDO e ausente: "viralizar", "substituir empresário/mentor"
- [x] Editais tratados como UMA fonte de renda entre várias (prospecção privada na tela)
- [x] Nunca "garante aprovação" — parecer declara simulação (FR-017)
- [x] Zero dado pessoal real (FR-018); persona declarada sintética em voz

---

## (a) Estrutura tempo-a-tempo — 4 critérios na ordem de força

Ordem = força no julgamento: **execução** (desempate oficial, jurado não testa → tem que VER funcionando) → **implementação técnica** → **impacto na trilha** → **comunicação** (transversal: ritmo, legenda, estética — o próprio vídeo pontua).

| # | Tempo | Bloco | Critério servido | Tela principal |
|---|-------|-------|------------------|----------------|
| 1 | 0:00–0:18 | Hook — o dinheiro existe, o empresário não | Impacto (semeado) + Comunicação | Motion: números grandes sobre o dark do app |
| 2 | 0:18–1:50 | **Demo ao vivo** — Lia do radar ao cachê pago | **Execução (25% + desempate)** | Screen record real: feed → sabatina → Pix → pipeline → prospecção → agenda |
| 3 | 1:50–2:22 | Por baixo do capô — engenharia | Implementação técnica (25%) | Diagrama de arquitetura + flashes de código + dashboard Convex |
| 4 | 2:22–2:45 | Negócio + impacto na trilha | Impacto (25%) | `/assinatura` + matemática R$ + mapeamento mentor |
| 5 | 2:45–3:00 | Fecho | Comunicação | End card: logo, URL pública, repo |

---

## (b) Narração completa — PT-BR, tom direto (~390 palavras ≈ 3:00 em ritmo de demo)

### Bloco 1 — 0:00–0:18 · Hook

> O Brasil injetou **quinze bilhões de reais** em fomento cultural — espalhados por mais de cinco mil municípios. E o mercado de shows movimenta outros **noventa e quatro bilhões** por ano.
>
> Mas um terço dos artistas diz que a maior dificuldade da carreira é **encontrar um empresário** — e um escritório fica com **metade do cachê**, num contrato de dez anos com multa milionária.
>
> A gente construiu o **Manager**: o coach de IA do trabalhador da arte. E ele já funciona. Olha.

### Bloco 2 — 0:18–1:50 · Demo ao vivo

**0:18–0:38 — persona + o momento Jarvis**
> Essa é a Lia — cantora e compositora, MEI, de Belo Horizonte. Perfil sintético de demo; os editais, todos reais. E o Manager **já conhece a carreira dela**. Ela liga o modo voz e pergunta:
>
> *"Quantos shows a gente fechou?"*
>
> — *"Três fechados pagos, cinco em negociação — o Sesc Interlagos e o Bar do Zé entre eles — e o edital do ProAC fecha em seis dias. Quer sabatinar?"*
>
> O coach responde **por voz, com os dados reais dela** — gigs, leads, prazos. Não é chatbot: ela manda, ele executa.

**0:38–0:48 — radar federado**
> O radar dela tem **cento e vinte oportunidades abertas agora**, coletadas de trinta fontes Mapas Culturais — MinC, Funarte, estaduais e o long tail municipal do PNAB. Cada card mostra fonte, prazo, valor e se aceita pessoa física.

**0:48–1:15 — sabatina (o momento)**
> Antes de se inscrever, a Lia faz a **sabatina**: um parecerista simulado entrevista ela contra a rubrica real do edital. Pergunta difícil — orçamento, contrapartida, trajetória. Resposta vaga? Ele **aprofunda**, não aceita.
>
> No fim, o parecer: **setenta e quatro em cem**, os pontos onde ela perderia nota, os documentos que faltam — e o aviso honesto: a decisão final é sempre da banca.
>
> O Manager não escreve a proposta pela Lia. **Ele prepara a Lia.**

**1:15–1:24 — Pix**
> A segunda sabatina é paga — e o destrave é um Pix de **nove e noventa**. Checkout real, confirmação automática, sabatina liberada na hora.

**1:24–1:36 — pipeline + alertas**
> O parecer cai no pipeline dela — descoberta, inscrito, ganho, prestação de contas. Documento vencendo? O Manager avisa por email, WhatsApp — **e até liga**. Uma vez só — nunca duplicado.

**1:36–1:50 — prospecção → o coach executa**
> E edital é só **uma** das fontes de renda. *"Me acha casas de show no Rio que tocam MPB"* — o agente sai prospectando na web e os leads caem no funil. Lead andou até "fechado"? Vira **gig** na agenda — marcado, feito, **pago** — e o caixa consolida em reais.

### Bloco 3 — 1:50–2:22 · Por baixo do capô

> Por baixo: **ingestão federada** da API pública Mapas — a mesma API em mais de quarenta instâncias — com normalização de formatos heterogêneos, deduplicação e isolamento de falha: uma fonte cai, o catálogo fica de pé. Onde tem firewall, entra **agente de scrape**.
>
> **Convex** sustenta banco, realtime e quatro rotinas agendadas. A sabatina também roda **por voz**: a Agora transporta o áudio; o cérebro — prompt e rubrica — fica no nosso servidor, num endpoint OpenAI-compatível (LLM agnóstico — OpenAI/DeepSeek/o que tiver crédito).
>
> E o webhook de pagamento é idempotente: confirmou, ativou.

### Bloco 4 — 2:22–2:45 · Negócio + impacto

> O radar é grátis. A assinatura, **quarenta e nove por mês** — menos que a comissão de um único show.
>
> A lógica é a que qualquer mentor de carreira ensina: **base organizada, audiência mapeada, venda no caixa, entrega orientada**. Só que em software que o artista pode pagar.
>
> É escala de acesso ao que hoje custa metade do cachê — ou a empresa própria que Anitta, Ivete e Ludmilla montaram na mão quando puderam.

### Bloco 5 — 2:45–3:00 · Fecho

> Quinze bilhões em fomento. Noventa e quatro bilhões em shows. E o trabalhador da arte, pela primeira vez, com alguém do lado dele.
>
> **Manager. Preparar, não escrever.** O link tá no ar — e o código é público.

---

## (c) Shot list — o que aparece na tela (demo real, não mockup)

| Tempo | Tela | Notas de produção |
|-------|------|-------------------|
| 0:00–0:06 | Número "R$ 15 bi" preenchendo a tela (emerald-400 sobre neutral-900, tipografia do app) | Motion simples; a estética do app É a linguagem (Kiss é videomaker — capricho é nota) |
| 0:06–0:12 | "5.570 municípios" → mapa do Brasil polvilhado de pontos | Pontos = instâncias Mapas reais |
| 0:12–0:18 | "32% sem empresário" / "50% do cachê" → corte seco pro app | Transição direta pra tela real — sem logo animado longo |
| 0:18–0:28 | `/pipeline` ou feed com perfil da **Lia Moura** logado | Email fake visível tipo `lia@demo.dev`; badge MEI |
| 0:28–0:42 | `/oportunidades`: contador "**110 oportunidades · N fontes**" no topo; scroll rápido; zoom no card com "aceita você ✓", "até R$ X", "máx 1 proposta/proponente", badge de prazo | ⚠️ atualizar o número falado pro count real do dia; dar zoom/recortar no card — jurado lê badge |
| 0:42–0:52 | `/sabatina/[id]`: primeira pergunta do parecerista chegando (digitação real ou corte de 1s) | Escolher um edital ENRICHED com rubrica explícita no banco |
| 0:52–1:02 | Lia responde vago ("quero fazer um show na cidade") → parecerista aprofunda | Cortar espera de rede no editing — manter verossimilhança, não duração |
| 1:02–1:12 | Card do **parecer**: score grande 74/100, summary, lista de gaps, "Falta: …", warning "a decisão final é sempre da banca real" | Congelar 2s no score — é a imagem que o júri lembra |
| 1:12–1:22 | Paywall → `/assinatura?unlock=<id>` → checkout AbacatePay sandbox com QR/código Pix → retorno "sabatina liberada" | Gravar o clipe do webhook funcionando ANTES (backup do redteam); mostrar `webhookLog` se o sandbox falhar ao vivo |
| 1:22–1:34 | `/pipeline`: kanban 7 estágios, card da oportunidade com nota 74; doc com vencimento próximo → cut pro email Resend real chegando | Inbox aberta em split ou corte rápido; mostrar que não há duplicata |
| 1:34–1:44 | `/prospeccao`: chips de tipo (casa_de_show, festival, marca), botão prospect → leads reais caindo com `sourceUrl`; status subindo no funil até "fechado" | Nicho+cidade da Lia no form; leads deduplicados por perfil |
| 1:44–1:50 | `/agenda`: lead fechado → gig criada com cachê; status marcado→feito→**pago**; total consolidado em R$ | O fechamento do loop em dinheiro — "medir em R$" literal |
| 1:50–2:02 | Diagrama de arquitetura montando por camadas: instâncias Mapas (N nós) → normalização+dedup+isolamento → Convex → app | Desenhar no Figma/Excalidraw com os nomes reais (`ingest:run`, `discover`, `enrich`, `alerts`) |
| 2:02–2:10 | Flash de código real: `convex/crons` (4 rotinas), `lib/mapas.ts` (toNum/toStrArray), `convex/discover.ts` (Firecrawl `/agent`) | Máx 3 flashes de 2s — legível, não tour de código |
| 2:10–2:16 | Voz: clipe da sabatina falada OU (se UI de voz não estiver mergeada até a gravação) POST `/api/voice-session` subindo agente Agora + resposta SSE do `/api/voice-llm` | ⚠️ voz hoje é API-level (`app/api/voice-*`); se não houver tela, mostrar terminal+console Agora — ainda é prova |
| 2:16–2:22 | `webhookLog` no dashboard Convex: evento idempotente, plano ativado | Prova de engenharia de billing, não só a tela bonita |
| 2:22–2:32 | `/assinatura`: Manager R$49/mês · R$490/ano · Pro R$99 · avulso R$9,90 — ao lado, "escritório = ~50% do cachê por 10 anos" | Split-screen de preço vs. âncora (dado verificado em research-agencias.md) |
| 2:32–2:45 | Grid dos 4 pilares do coach (radar+sabatina / prospecção / agenda & cachês / docs organizados) com os rótulos Base→Audiência→Venda→entrega Orientada embaixo | Nod pro vocabulário B.R.A.V.O. sem citar nome próprio |
| 2:45–3:00 | End card: `manager_` wordmark, URL pública, `github.com/jazzautomations/edital-hacker`, trilha | Segurar 3s estático — jurado pausa pra copiar link |

**Pre-flight de gravação** (riscos do redteam): seed da Lia com MEI + áreas casando com ≥3 editais reais; um edital enriched com rubrica + `registrationLimitPerOwner` visível; banco Convex já populado (se Mapas cair no dia, o feed segue cheio); clipes backup do Pix e da sabatina gravados antes; email Resend disparado uma vez pra inbox estar quente.

---

## (d) Legendas / resumo em EN (júri parcialmente não-lusófono)

> Formato: uma linha por bloco pra legenda; usar como description text do vídeo no painel também.

- **0:00–0:18** — Brazil injected R$15B in cultural funding across 5,000+ municipalities. Live music moves R$94B/year. Yet 1 in 3 artists says their biggest career obstacle is finding a manager — and a human booker takes 20% of every fee.
- **0:18–0:28** — Meet Lia (synthetic demo profile): singer-songwriter, MEI. The opportunities you'll see are all real.
- **0:28–0:42** — Her radar: 110 open opportunities right now, federated from Mapas Culturais instances nationwide. Source, deadline, value, eligibility, proposal limits — on every card.
- **0:42–1:12** — Before applying, she takes the sabatina: a simulated jury interviews her against the edital's real rubric, pushes back on vague answers, then issues a 74/100 verdict with gaps and missing documents. The Manager doesn't write her proposal — it prepares her.
- **1:12–1:22** — Second sabatina? A R$9.90 Pix unlocks it — real checkout, automatic activation.
- **1:22–1:34** — Verdict lands in her pipeline; expiring documents trigger deduplicated email alerts.
- **1:34–1:50** — Editais are only one income stream: an agent prospects venues, festivals and brands; a closed lead becomes a gig — booked, done, paid — consolidated in reais.
- **1:50–2:22** — Under the hood: federated ingestion with normalization, dedup and fault isolation; Convex DB + realtime + 4 crons; voice via Agora Conversational AI with our own OpenAI-compatible LLM endpoint (prompt and rubric stay server-side); idempotent payment webhooks.
- **2:22–2:45** — Free radar; R$49/month — less than one show's commission. Base, audience, sales, oriented delivery: what a career mentor teaches, as software artists can actually afford.
- **2:45–3:00** — R$15B in funding. R$94B in live music. And, for the first time, someone on the art worker's side. Manager — prepare, don't write.

---

## (e) Q&A prep — 8 perguntas prováveis × respostas de 2 linhas

**1. "Isso substitui o mentor/empresário humano?"**
Não — é escala de acesso. A mentoria boa atende dezenas e cobra milhares; o Manager entrega a primeira camada (base organizada, oportunidade, preparo) pra milhares de artistas que hoje não têm acesso a ninguém.

**2. "É só um wrapper de GPT?"**
O LLM é uma peça atrás de um endpoint próprio e trocável. O que não é wrapper: ingestão federada multi-instância com normalização heterogênea + dedup + isolamento de falha, agente de scrape nas fontes com WAF, 4 crons, webhook idempotente — e o CRM acumulado (pipeline, docs, leads, gigs) que vira o moat.

**3. "E se acabar a PNAB?"**
Edital é uma fonte entre várias — a demo já mostra prospecção privada, funil de leads e agenda de cachês funcionando sem nenhum edital. E a mesma máquina de ingestão pluga qualquer fonte nova (estadual, municipal, privada) sem mudar o produto.

**4. "Como garantem que a nota reflete a banca real?"**
Ninguém garante — e o produto diz isso na tela: o parecer declara simulação ancorada na rubrica real do edital, e a decisão é sempre da banca (FR-017). O valor é treinar o artista exatamente onde ele perderia ponto, antes de gastar a inscrição.

**5. "Quem paga?"**
O próprio artista: R$9,90 pra destravar a sabatina de um edital ou R$49–99/mês — ancorado no booker de 15–20% do cachê e nas consultorias de R$2–5 mil. WTP é a premissa fraca assumida: estamos validando com concierge pago real (D010).

**6. "Por que Agora?"**
Transporte RTC maduro + ASR/TTS/LLM managed nos créditos do usuário — e o cérebro fica nosso: system prompt, rubrica do edital e a tool `submit_verdict` que grava a nota no pipeline são nossos; a Agora só transporta voz.

**7. "Qual a diferença pro Projeto Contemplado?"**
É o wedge mais próximo: radar "que aceita você" + IA que lê o edital + escreve junto — mas termina na inscrição: copiloto por-edital. A gente é a relação contínua: pipeline que sobrevive ao edital, docs com vencimento, alertas deduplicados, e depois da aprovação ainda tem execução e prestação de contas; fora do edital há gigs, cachês e leads. "De assistente de inscrição a empresário permanente."

**8. "E o Clube Emma? Tem parecerista e prestação de contas."**
O mais completo no eixo edital — e é infoproduto anual de R$700–4.000 cujo "modo parecerista" revisa o texto que a própria IA escreveu. A gente sabatina o *artista* (interrogação interativa, inclusive por voz) e empresaria a *carreira*: Emma não toca renda privada — zero agenda de cachês, zero leads de casas/marcas. E o preço: R$9,90 avulso vs. assinatura anual.

**9. "E o By Booker? Já tem agenda, cachê, EPK, rider."**
Cobre bem o eixo música-ao-vivo — mas o lead é *passivo* (o contratante te acha no marketplace) e não existe fomento: zero editais, zero sabatina, zero prestação de contas. A gente cobre a renda mista real (edital+gig+aula+patrocínio) e o agente **sai prospectar** via Firecrawl em vez de esperar ser achado.

**10. "Tem dado pessoal real na demo?"**
Zero — a persona é sintética e declarada (FR-018); só dados públicos de editais são reais. E conteúdo vindo de edital é tratado como dado inerte: prompt injection vira flag no parecer (`injectionDetected`), nunca instrução (FR-016).

---

## Notas finais de produção

- **Ritmo**: narração ~130–140 ppm em cima de demo cortada; nunca deixar a tela esperando a fala — cortar loadings na edição.
- **Estética**: reusar a paleta do app (emerald-400/neutral-900), fonte mono pros números — o vídeo parece extensão do produto.
- **Legenda EN**: queimar no vídeo ou .srt anexo — júri não-lusófono não pode depender de auto-translate.
- **Backup (redteam)**: Mapas fora do ar → banco populado segue mostrando 110; webhook sandbox falha → `webhookLog` + clipe; gravar tudo com folga pra re-take do bloco 2, que carrega o desempate.
- **Números vivos**: conferir count do feed e preços na `/assinatura` no dia da gravação — a narração deve bater com a tela.
- **Não commitar**: este arquivo é spec de produção (P001); vídeo final sobe no painel até 30/nov com folga (P007), não perto das 23h.
