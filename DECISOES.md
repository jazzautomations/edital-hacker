# DECISOES — registro de decisão (ADR light)

> Toda decisão que afeta mais de um cartão, o escopo, ou o rumo do produto entra aqui: o quê, o porquê, e a FONTE. "O agente falou" não é fonte.

## D001 — 2026-11-05 — Perfil do hack e implicações

- **Decisão**: Hack Brasil 2026, trilha Cultura & economia criativa; metodologia adaptada pra formato 26 dias online + final presencial.
- **Motivo**: requisitos-gate ditam repo novo, vídeo ≤3min, dados sintéticos; desempate por execução técnica coloca "funciona" acima de tudo.
- **Fonte**: regulamento item 2, 5.2, 6.1–6.9, 9.1–9.3 → `CONTEXTO.md`.
- **Afeta**: tudo.
- **Reversível?**: Não (regras do evento).

## D002 — 2026-11-05 — Produto: empresário de IA, não "IA que escreve edital"

- **Decisão**: Posicionamento = "o empresário de IA do trabalhador da arte" — radar + sabatina + CRM, não gerador de proposta.
- **Motivo**: diferenciação vs. Projeto Contemplado (que escreve POR você); nossa wedge é sabatina (stress-test) + pipeline/prestação. Feed sozinho = paridade.
- **Fonte**: teardown do site do PC (59 editais, internacionais, ficha IA, R$19 avulso/R$99–249) + red team completo.
- **Alternativas descartadas**: "IA que escreve edital" (commodity, concorrência direta); marketplace de gigs (cold start comprovado — Gigz/iauu).
- **Afeta**: spec inteira, pitch, ordem da demo.
- **Reversível?**: Sim, com custo alto de reescrita.

## D003 — 2026-11-05 — Stack com patrocinadores resolvendo FRs reais

- **Decisão**: Next.js 16 + Convex (DB/crons/realtime) + Gemini (LLM/voz) + Firecrawl + Resend + AbacatePay + WorkOS.
- **Motivo**: regulamento 6.3 — integração não pontua por si só, mas a implementação técnica sim; cada sponsor cobre um FR da spec. Convex é a espinha; Gemini é a única peça não-sponsor (melhor Live API PT-BR — não existe LLM entre os patrocinadores).
- **Fonte**: docs oficiais de cada sponsor (verificado: AbacatePay subscriptions nativas, Firecrawl `/v2/agent`, Resend batch, WorkOS `npx workos@latest`, Gemini `authTokens.create`).
- **Afeta**: T008–T045.
- **Reversível?**: Parcialmente (Convex e Abacate têm custo de troca alto).

## D004 — 2026-11-05 — Wedge = editais; moat = CRM acumulado

- **Decisão**: Editais são a porta de entrada (dor aguda, dados públicos); retenção/moat é pipeline + histórico + prestação.
- **Motivo**: edital é sazonal (insight do fundador, áudio 05/nov) — o feed traz, o pipeline segura. Nenhum concorrente cobre pós-inscrição.
- **Fonte**: áudio do fundador transcrito (faster-whisper local); Vortex/Abramus (dores 20–22%); Pesquisa Empresariamento (32% não acha empresário; 26% dos empresários sem contrato).
- **Afeta**: US3+US4, ordem da demo (abre na sabatina/pipeline, não no feed).
- **Reversível?**: Sim.

## D005 — 2026-11-05 — Ingestão federada Mapas + Firecrawl na borda

- **Decisão**: API pública das instâncias Mapas como primária; Firecrawl `/v2/agent` semanal pras fontes WAF/fora da rede.
- **Motivo**: API é grátis e estruturada (132 opps vivas em 6 fontes, medido ao vivo); agent é o único jeito nas instâncias com 403 (DF/MA) e prefeituras fora da rede. Rubrica não sai por API (`evaluationMethodConfiguration` = ID sem endpoint) → enrich é requisito.
- **Fonte**: testes ao vivo em `lib/mapas.ts` + `/api/opportunity/describe` (5/nov).
- **Alternativas descartadas**: raspar tudo (lento, frágil); só federal (perde o argumento municipal — PNAB descentraliza o dinheiro).
- **Afeta**: T008, T014–T017, T038.
- **Reversível?**: Sim.

## D006 — 2026-11-05 — Elegibilidade e desclassificadores por dados da API

- **Decisão**: `personTypeMatches()` por keyword map (PF/MEI/PJ/coletivo); `registrationLimitPerOwner` normalizado + tag no feed.
- **Motivo**: bug real — match anterior quebrava em "Coletivo sem CNPJ" (matchava a palavra "sem"); limite de propostas é desclassificador direto da API sem scraping.
- **Fonte**: describe endpoint + teste ao vivo; análise speckit-analyze.
- **Afeta**: FR-007, feed, alertas.
- **Reversível?**: Sim.

## D007 — 2026-11-05 — Mentor com voz vira diferencial central (de stretch pra core)

- **Decisão**: T027 (voz Gemini Live) sobe de stretch pra feature-chave da demo; visão "mentor que executa" entra como roadmap no pitch.
- **Motivo**: áudio do fundador — o diferencial vs ChatGPT é o mentor com voz + acesso à aplicação; Live API já tem rota efêmera implementada e é o momento memorável do júri.
- **Fonte**: áudio transcrito 05/nov + docs Gemini (`authTokens` com `liveConnectConstraints`).
- **Afeta**: US2, ordem da demo, T027.
- **Reversível?**: Sim — se Live falhar, texto E2E permanece o caminho seguro.

## D008 — 2026-11-05 — Monetização: planos + destrava avulsa R$9,90 via Pix

- **Decisão**: Free radar → R$49/mês · R$490/ano → Pro R$99/R$990 · destrava-edital avulsa R$9,90; ativação por webhook idempotente.
- **Motivo**: âncora real (consultoria R$2–5k/projeto, booker 15–20%, PC R$19 avulso); avulso baixa barreira pra WTP frágil do segmento; Pix nativo = cena da demo.
- **Fonte**: docs AbacatePay (`/subscriptions/create` → checkout → `subscription.completed`; `trialDays`; Pix Automático) + preços verificados dos concorrentes.
- **Afeta**: FR-014/015, US5, `/assinatura`.
- **Reversível?**: Preços sim; arquitetura não.

## D009 — 2026-11-05 — Metodologia adaptada: board+decisões sem worktree (time 2+agente)

- **Decisão**: Usa `CONTEXTO.md`, `DECISOES.md`, `BOARD.md` e as 7 leis; dispensa worktree-por-task porque a execução é serial (Devin) com merges diretos na main demo-ready.
- **Motivo**: a própria skill diz "time de 2: um orquestra, outro builda"; worktree isola arquivo mas não resolve DB/porta/env — e o gargalo é E2E, não conflito de merge.
- **Fonte**: SKILL.md do hackathon-squad-skill + experiência da sessão.
- **Afeta**: BOARD.md, fluxo de merge.
- **Reversível?**: Sim — escala pra worktree se o time paralelizar.

## D010 — 2026-11-05 — Validação WTP por concierge pago

- **Decisão**: Vender "parecer de banca simulada" por R$9,90 Pix manual pra 15–20 artistas — valida willingness-to-pay antes de escalar features.
- **Motivo**: WTP é a premissa mais fraca do red team; dinheiro saindo da conta é o único sinal que conta. Resultado vira evidência no pitch ("N artistas pagaram").
- **Fonte**: red team (premissa WTP fraca) + preço avulso já implementado.
- **Afeta**: pitch, possivelmente reposicionamento (produtor/MEI se conversão baixa).
- **Reversível?**: Sim.

## D011 — 2026-11-09 — Prospecção comercial entra no MVP (não é fase 2)

- **Decisão**: `leads` + `/prospeccao` + Firecrawl `/agent` caçando leads reais (casas de show, festivais, marcas, escolas, produtoras) por nicho+cidade. Funil próprio: novo→contatado→respondeu→negociando→fechado|perdido. Lead fechado → vira gig.
- **Motivo**: o pitch público no grupo (05/11) já vendia "prospecção + edital" juntos; edital é sazonal — prospecção é o que segura retenção. Mesma máquina (discover+enrich+CRM), custo marginal baixo.
- **Fonte**: áudio transcrito do fundador no grupo Hack Brasil 🇧🇷 (05/11 23:26) + instrução direta "a prospecção entra agora".
- **Afeta**: FR-019 (novo), schema `leads`, `discover.prospectLeads`, `/prospeccao`.
- **Reversível?**: Sim — tabela/rota isoladas.

## D012 — 2026-11-09 — Voz via Agora Conversational AI (não Gemini Live nativo)

- **Decisão**: Sabatina por voz usa Agora RTC + Conversational AI Engine. `POST /api/voice-session` sobe o agente no canal com `llm.url = /api/voice-llm` — endpoint OpenAI-compatível que chama Gemini por trás. ASR/TTS `credential_mode: managed` = sai dos créditos Agora do time.
- **Motivo**: usuário tem créditos Agora; transporte RTC maduro; o cérebro continua nosso (prompt + rubrica server-side) — Agora só vê voz. Endpoint `/api/voice-llm` é OpenAI-compat, então testável sem Agora.
- **Fonte**: docs Agora Conversational AI (`/v2/projects/{appid}/join`, custom LLM contract SSE) + créditos informados pelo usuário.
- **Afeta**: T027 redefinido, `app/api/voice-llm`, `app/api/voice-session`, `.env.example` (AGORA_*).
- **Reversível?**: Sim — Gemini Live route (`/api/live-token`) fica como alternativa.

## D013 — 2026-11-09 — Framing final: coach/manager dos trabalhadores da arte

- **Decisão**: O produto é o COACH — mentor-agente que organiza a vida do trabalhador da arte. Quatro pilares: (1) radar+sabatina de oportunidades, (2) prospecção de gigs, (3) agenda & financeiro (cachês, datas, pago/pendente), (4) organização de material (docs/EPK — EPK gerado é roadmap). Voz = a interface do mentor.
- **Motivo**: instrução explícita do fundador ("a brisa é o coach musical"); resolve sazonalidade do edital com valor contínuo; alinha pitch público com produto.
- **Fonte**: áudios 05/11 + conversa 09/11.
- **Afeta**: spec FR-019/020/021, BOARD, pitch (demo abre no coach falando, não no feed).
- **Reversível?**: Não — é o posicionamento.

## D014 — 2026-11-09 — Vocabulário do pitch = a língua dos prováveis mentores

- **Decisão**: Pitch e demo usam o vocabulário de Thiago Kiss e Jacques Figueras (prováveis mentores da trilha): método B.R.A.V.O. (Base→Repertório→Audiência→Venda→entrega Orientada) mapeia 1:1 nos pilares do produto. Regra de copy: "preparar, não escrever" · medir em R$ (cachê, pipeline, renda) · nunca "viralizar/substituir empresário" · editais = UMA fonte de renda entre várias (blinda "e se acabar a PNAB?").
- **Motivo**: os dois vendem exatamente "coach/manager de carreira de artista" como mentoria high-ticket (Kiss: R$2,6M em mentoria; Figueras: 2 Grammy, 20+ anos de booker, mentorado típico = quem já aprovou edital PNAB). O produto democratiza em software o que eles vendem — enquadrar como escala de acesso, não substituto.
- **Fonte**: relatório de pesquisa 09/11 (fontes primárias: jfigueras.com.br, probandas.com.br, TUM Festival, Hotmart PRO BANDAS, NCM AO VIVO).
- **Afeta**: roteiro do vídeo (P001), copy da landing, persona da demo (artista midstream que mistura edital + gig privado), capricho visual elevado (Kiss é videomaker profissional — estética é nota escondida).
- **Reversível?**: N/A — é copy/estratégia de pitch.

## D015 — 2026-11-09 — Redes sociais/conteúdo = fase 2 (pós-hackathon)

- **Decisão**: Ferramentas de redes sociais, geração de conteúdo e marketing ficam FORA do MVP do hackathon e entram na fase 2 (continuação do produto pós-12/dez).
- **Motivo**: (1) a trilha exclui explicitamente "ferramentas de publicidade e marketing em geral, automação de perfis e engajamento" (regulamento 5.2) — incluir agora arrisca desclassificação do escopo; (2) a dor é real e documentada (artista obrigado a ser criador de conteúdo) — pós-hack a restrição some e vira argumento de retenção/upgrade; (3) Kiss vende "sua marca parece mais cara" e Figueras vende Instagram para Músicos — a fase 2 é exatamente o que os mentores cobram caro pra ensinar.
- **Fonte**: regulamento 5.2 + áudio do fundador (05/11, creator economy) + teardown dos funis (Instagram para Músicos, módulo divulgação do NCM).
- **Afeta**: roadmap pós-hack — EPK/material já no MVP (é documento, não marketing); fase 2 = conteúdo/calendário/anúncios.
- **Reversível?**: Sim — se o regulamento for reinterpretado, volta pro escopo.

## D016 — 2026-11-09 — Notificações multi-canal: Evolution na demo, Nvoip na produção

- **Decisão**: Lembretes do coach saem por `lib/notify.ts` com canais plugáveis: **WhatsApp via Evolution API** (instância `jazz` já no ar — texto livre, zero aprovação Meta, manda pro número do time na demo) + **Nvoip** para SMS `/v3/sms`, torpedo de voz TTS (`/v3/torpedo/voice` — "o coach te liga"), OTP e WhatsApp oficial WABA quando o template aprovar. O dispatch vive em `POST /api/notify` no Next porque a Evolution está na tailnet (Convex cloud não alcança); o cron `alerts.run` chama a rota com `NOTIFY_SECRET`.
- **Motivo**: Nvoip é sponsor com prêmio (item 10.3: Pro 12u/3anos + R$3k/2k/1k créditos; 3 meses Pro p/ participante com rascunho aprovado) e cobre o que Evolution não faz (SMS, voz, OTP, oficial). Evolution destrava a demo de WhatsApp HOJE — template Meta leva dias. Artista vive no zap: lembrete de prazo no bolso é a feature que o usuário sente.
- **Fonte**: docs Nvoip v3 (github.com/Nvoip/nvoip-api-examples, api.nvoip.com.br/v3 OAuth) + regulamento 10.3 + pesquisa de sponsors 09/11.
- **Afeta**: schema (`profiles.phone`, `alertLog.channel`), `lib/nvoip.ts`, `lib/notify.ts`, `app/api/notify`, `convex/alerts.ts` (deadline_phone), `.env.example`.
- **Reversível?**: Sim — canal é env var; sem chaves o notify é no-op.
- **Atenção regulamento 6.9**: demo só dispara pra número do próprio time.

## D017 — 2026-11-09 — Radar vira vigilância: Firecrawl Monitoring + veredito da voz no pipeline

- **Decisão**: (1) **Firecrawl `/v2/monitor`** — monitors de crawl nos portais bloqueados (DF/MA/PE/SP) + search web-wide com goal LLM, notificando `POST /webhooks/firecrawl` no Convex que faz upsert em `opportunities` (externalId=url → dedup grátis). Setup via `convex/monitors.ts` internal action. (2) **Agora `llm.tools`** — banca de voz chama `submit_verdict` → `POST /api/voice-verdict` persiste `sabatinaSessions` + `pipeline.sabatinaScore` (o veredito da voz cai no kanban igual ao texto). (3) **Digest semanal** — cron `weekly-digest` segunda 12h UTC envia "sua semana" por Resend batch (prazos 7d, leads parados, gigs, a receber). (4) **Artefatos canônicos** — EPK página web `/epk` (ordem booker: quem→ouça→assista→bio→agenda→contato, sem cachê), contrato 11 cláusulas + checklist de negociação em anexo.
- **Motivo**: Monitoring é feature recém-lançada do Firecrawl — uso de ponta num critério de 25% (implementação técnica) e o presidente da comissão é CTO da Firecrawl. Voice-verdict fecha o gap T053 (voz não gravava nada). Digest é o "check-in semanal" que mentoria cobra caro. Artefatos seguem as estruturas canônicas pesquisadas (Anexo V PNAB, LL Cultural, EPK bybooker).
- **Fonte**: pesquisa sponsors + artefatos 09/11 (fontes primárias listadas nos relatórios).
- **Afeta**: `convex/monitors.ts`, `convex/http.ts`, `convex/digest.ts`, `convex/crons.ts`, `lib/firecrawl.ts` (createMonitor), `app/api/voice-session`, `app/api/voice-verdict`, `app/epk`, `app/api/contrato`, `app/agenda` (check-in in-app).
- **Reversível?**: Sim — tudo aditivo, nada remove o que funciona.

## D018 — 2026-11-10 — Mapa verificado de agências/showcases vira lead pronto

- **Decisão**: Prospecção ganha tipo `agencia`/`prefeitura` e um seed verificado (`lib/agencySeed.ts`): 16 agências BR + 7 feiras de showcase gratuitas + marketplaces — cada lead com gatekeeper nomeado, contato público e ângulo de rapport. Botão "🗺 Mapa de agências" em `/prospeccao` planta tudo no funil via `leads.seedMapa` (dedupe). Regras de mercado viram `AGENCY_INTEL` na memória do coach.
- **Motivo**: pesquisa OSINT verificou que (1) escritório 360 BR cobra ~50% do cachê em contrato de 5–10 anos c/ multa milionária — âncora do pitch corrige 20%→50%; (2) o destino documentado dos grandes é empresa própria (Anitta, Ivete, Ludmilla, Luan) — o produto se posiciona como "empresa própria de prateleira"; (3) showcase gratuito (SIM/FIMS/Porto Musical) é o lead mais barato que existe — inscrição põe o artista na frente de selos e bookers sem intermediário.
- **Fonte**: `specs/001-ai-artist-manager/research-agencias.md` — 2 dossiês com fonte primária (G1, Billboard, Pollstar, sites das agências, form.simsaopaulo.com, fims.com.br, womex.com).
- **Afeta**: `lib/agencySeed.ts`, `convex/leads.ts` (seedMapa), `app/prospeccao`, `lib/coach.ts` (intel no contextBlock), `pitch-video.md` (âncora de preço).
- **Reversível?**: Sim — seed é snapshot dez/2026; dossiê OSINT por lead continua fonte atualizada.

## D019 — 2026-11-10 — Vigia de documentos com validades canônicas

- **Decisão**: `lib/docRules.ts` codifica as validades reais verificadas (CRF-FGTS 30d → emitir na semana da entrega; CND federal/CNDT 180d; comprovante endereço 90d; 3 NFs <12m p/ inexigibilidade art. 23 §4º; CNAE-MEI compatível). O coach recebe cada doc vencendo + a regra correspondente no contexto; `/agenda` mostra o hint e link "emitir →".
- **Motivo**: 63/83 projetos indeferidos por formalidade no Linc Sorocaba — certidão vencida é a falha nº1 e custa a inscrição. Regra de ouro: FGTS dura 30d, nunca emitir junto com as federais.
- **Fonte**: pesquisa domínio 09/11 (prazos oficiais dos órgãos emissores) + stat formalidade.
- **Afeta**: `lib/docRules.ts`, `lib/coach.ts` (contextBlock), `app/agenda`.
- **Reversível?**: Sim — tabela de regras é dado, não código.
