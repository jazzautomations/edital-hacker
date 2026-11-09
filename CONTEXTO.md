# CONTEXTO — o perfil DESTE hackathon

> Preenchido no minuto 0 a partir do regulamento real. Todo modo da metodologia consulta este arquivo antes de agir.

## O hackathon

- **Nome/organizador**: Hack Brasil 2026 — AI TECH SPACE LLC. Comissão: Nicolas Silberstein Camara (CTO Firecrawl), Nicole Grossmann, Matheus Pagani.
- **Tema/desafio**: 7 trilhas. A nossa: **"Cultura & economia criativa"** — "projetos de criação, circulação ou consumo de cultura [...] ferramentas para artistas e criadores e formas de remunerar quem cria". Ficam fora: "ferramentas de publicidade e marketing em geral, automação de perfis e de engajamento artificial".
- **Formato**: online (Brasil inteiro) + final presencial · times de 1–4 · duração: ~26 dias online.
- **Datas/horários**: abertura 04/nov 19–21h · inscrição/submissão até **30/nov 23h59 BRT** · finalistas 02/dez · confirmação de presença 04/dez 23h59 · final **12/dez Google for Startups SP**.
- **Fonte das regras**: https://hackbrasil.com/regulamento (atualizado 02/nov/2026).

## Rubrica oficial (transcrita — item 9.1, é o mapa do pitch)

| Critério | Peso | O que o jurado pontua (literal) |
|---|---|---|
| Execução técnica | 25% | "se o produto funciona e está completo" |
| Implementação técnica | 25% | "a arquitetura, a qualidade do código e a escolha e o uso das tecnologias, APIs e ferramentas" |
| Impacto do projeto | 25% | "conforme o que cada trilha define como impacto" |
| Qualidade da comunicação | 25% | "no vídeo da fase online e na apresentação ao júri na final" |

**Desempate (9.3)**: execução técnica → impacto → maioria do júri.

## Requisitos-gate (o que MATA a submissão se faltar)

- [ ] Repo(s) público(s) criado(s) **depois** de 04/nov 21h BRT, commits só a partir daí (6.1) ✅ criado 05/nov
- [ ] Código pré-evento não copiável; só ideias podem continuar (6.2)
- [ ] Submissão: descrição + trilha + repo + **demo funcionando** + vídeo ≤3min (item 7)
- [ ] Uma trilha só; enquadramento é condição, não nota (5.4/5.5)
- [ ] Sem dados pessoais reais de terceiros na demo (6.9) — dados sintéticos
- [ ] Elegibilidade: brasileiro 18+ (qualquer país) ou estrangeiro residente no BR/com visto válido (3.1)

## Formato de julgamento (dita o que o Demo keeper protege)

- **Fase online**: júri avalia descrição + repo + vídeo + demo publicado. Jurado provavelmente NÃO testa o app ao vivo → **vídeo e descrição carregam a nota de comunicação inteira**; o link da demo precisa abrir e rodar.
- **Final presencial**: pitch stage no Google for Startups — narrativa + Q&A + demo ao vivo.
- Tempo de atenção online: vídeo ≤3min.

## Tracks e prêmios de patrocinador

Fonte: regulamento item 10.2–10.3 (lido 2026-11).

| Patrocinador | Prêmio (item 10.3) | Perk p/ participante* | Vale mirar? |
|---|---|---|---|
| Convex | US$ 6k **em dinheiro** (3k/2k/1k) — único cash | — | **Sim** — já é nosso backend |
| Firecrawl | US$ 50k créditos (25k/15k/10k) | 5.000 créditos p/ integrante | Sim — agent cobrindo fontes WAF |
| Nvoip | Pro 12 usuários 3 anos + número virtual c/ DDD 3 anos (R$ 35.532/time) + créditos R$ 3k/2k/1k | 3 meses Pro p/ 1 usuário (contas novas) | Sim — **lembretes no WhatsApp/SMS** = feature core |
| Cognition/Devin | US$ 20k créditos (10k/6k/4k) | cupom US$ 20 Devin | Sim — somos nós |
| Resend | US$ 10k créditos ×3 times, 12 meses | 3 meses Pro p/ finalistas | Sim — alertas deduplicados |
| AbacatePay | taxa reduzida Pix/cartão: R$ 300k/150k/50k top3 + R$ 10k p/ menção honrosa, por até 24m pós-lançamento | taxa reduzida já durante o hack | Sim — checkout ao vivo na demo |
| WorkOS | pacote auth domínio próprio 12m (US$ 1.188) p/ cada finalista | — | Sim — auth fase 2 |
| Capivarafy | consultoria captação não-diluitiva até US$ 30k em taxas isentas ×3 (sem CNPJ p/ iniciar) | — | Sim — **nosso produto É o domínio deles** |
| Globalfy | LLC/C Corp grátis (US$ 998–1.308) ×5 + cupons US$ 200–500 p/ finalistas | cupom p/ finalistas | Não — irrelevante pro MVP |
| Jumpstart | até 4 vistos O-1/J-1 (US$ 40k) p/ 1º lugar | — | Não — irrelevante pro MVP |
| Puentes | fast-track última etapa coorte p/ 1º (sem vaga garantida) | — | Consequência de shippar |

\* **Perks de participante destravam quando o rascunho do projeto é aprovado no painel** (por ordem de aprovação, até 2.000 participantes). Ação: submeter rascunho CEDO → destrava Firecrawl 5k + Nvoip 3m + Devin US$20.

## Restrições e peculiaridades

- Codebase: greenfield obrigatório (repo novo pós-abertura).
- IA: permitida e encorajada.
- Mentorias opcionais no Discord; livestreams 9, 16, 23, 27/nov.
- Jurados anunciados até 30/nov; AbacatePay/Resend já forneceram jurados em eventos anteriores dos mesmos organizadores.

## Time e recursos

- Humanos: Muniz (produto/negócio) + Laura (equipe — **verificar elegibilidade BR**, item 3.1)
- Agentes: Devin (implementação, pesquisa, ops)
- Stack: Next.js 16 + Convex + Gemini + Firecrawl + Resend + AbacatePay + WorkOS

## → O QUE ISSO MUDA NA METODOLOGIA

- **Cronograma real**: 26 dias — cadência, não sprint. Fases: E2E+dados (dias 2-4) → voz/mentor+auth (5-8) → validação concierge pagando (contínuo) → polish+demo data (meio) → vídeo (últimos 5-7 dias) → submissão c/ folga.
- **Desempate = execução técnica primeiro** → produto FUNCIONANDO é prioridade zero absoluta; feature a mais nunca às custas de bug no golden path.
- **Vídeo ≤3min carrega 25% da nota** → golden path roteirizado pra câmera; grava clipes de features assim que mergem (B-roll incremental), não no dia 29.
- **Jurado provavelmente não testa na fase online** → descrição + README + link público estável são P0; onboarding sem fricção na demo.
- **AbacatePay durante o hack** → integrar cedo dá taxa reduzida real + a cena do Pix no vídeo.
- **"Trabalhadores da arte"** (mentor/CRM) fica na trilha — mas conteúdo/marketing fica FORA: nenhuma feature de "gerar post/engajamento" entra no board (regra 5.2).
- **Dados sintéticos obrigatórios** → seed de perfil/projeto fake; só oportunidades públicas são reais.
- **Cortável sem custo**: marketplace de gigs, app nativo, internacionalização do produto (só README/vídeo em EN).
- **Riscos específicos**: API Mapas cai no dia do vídeo → banco já populado + backup gravado; Convex dev precisa de login humano (bloqueio atual); fuso BR p/ deadline 23h59.

## `[VERIFICAR]`

- [ ] Elegibilidade da Laura (residência BR ou visto) — confirmar antes de registrar no time
- [x] Perks de sponsor no painel: **sim e dependem de rascunho aprovado** — Firecrawl 5k créditos, Nvoip 3m Pro, Devin US$20. Submeter rascunho cedo = destravar chaves grátis (item 10.3)
- [ ] Jurados oficiais (anunciados até 30/nov) — checar quando sair e adaptar pitch
- [ ] Evento exato de downgrade de assinatura da AbacatePay após esgotar retryPolicy — validar em sandbox
