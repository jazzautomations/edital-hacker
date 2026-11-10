# Pesquisa: agências, empresários e scouting (dez/2026)

Dois dossiês OSINT (agências globais+BR / workflow de scouting). Tudo aqui
verificado em fonte primária ou marcado [INFERIDO]. Virou produto em
`lib/agencySeed.ts` (mapa de leads verificados) e `AGENCY_INTEL` (regras
de negociação na memória do coach).

## O achado central pro pitch

**No Brasil, empresário custa metade do cachê.** Escritório 360 (gestão +
booking + gravadora + festival próprio) cobra ~50% do cachê em contrato de
5–10 ANOS com multa milionária — AudioMix pediu R$31M a Jorge & Mateus.
Manager global: 15–20% do gross. Booking: ~10% do show. Agente legítimo
nunca cobra upfront.

**E o destino documentado dos grandes é a empresa própria**: Anitta
(Rodamoinho), Ivete (IESSI), Ludmilla (Sem Querer), Luan Santana (LS
Music), Safadão (Camarote), Jorge & Mateus, Henrique & Juliano — todos
saíram de escritório quando ganharam leverage. Zé Neto, literal:
"aprendemos a ser gestor da nossa carreira".

→ **O Manager é a empresa própria de prateleira.** A estrutura que os
grandes constroem na mão, por R$9,90 em vez de 50% do cachê. Essa é a
narrativa do vídeo.

## Como agência acha talento (workflow Chartmetric verificado)

1. Scouting brief (gênero × território × estágio) →
2. Validação multi-sinal: **spike numa plataforma só = fraco**; momentum
   real = ≥3 sinais independentes convergindo →
3. Comparação com peers do mesmo coorte →
4. Shortlist → revisão humana. Booker só fecha depois de VER AO VIVO —
   a exigência #1. "Não me procure até esgotar um show na sua cidade
   natal" (regra documentada).

→ O dossiê OSINT do Manager já opera na mesma lógica: fonte cruzada,
evidência, nunca uma métrica só.

## O que virou código

- **`AGENCY_SEED`** — 25 leads verificados: 16 agências BR (Let's GIG,
  Boogie Naipe, Talismã, Agulha, Casa de Abelha, Silëncio, Rebuliço,
  Nascimento, BTA, Box Talents, Coral 360, Entourage, PlusNetwork, K2,
  Criative, Bossa FM) + 7 feiras de showcase com inscrição GRATUITA
  (SIM, Porto Musical, FIMS, CoMA, Rio2C, TUM/MUCHO!, WOMEX) + 2
  marketplaces. Cada um com gatekeeper nomeado, contato público e
  ângulo de rapport.
- **`leads.seedMapa`** — botão "🗺 Mapa de agências" no /prospeccao
  planta tudo no funil com dedupe.
- **`AGENCY_INTEL`** — 4 regras de mercado na memória do coach.

## Fontes Tier-0 pra "momentum tracker" (fase 2, custo zero)

Spotify weekly charts (endpoint público), Kworb BR daily/weekly, Apple
RSS marketing tools, Deezer chart, Last.fm, Crowley Top 100 (airplay),
Sua Música (Nordeste — forró/piseiro não aparece no Spotify), ECAD
ranking mensal, TikTok Creative Center "breakout", setlist.fm.
Sympla/Shotgun expõem sold-out + lotes = sinal de demanda de show.
Viberate tem MCP server (€99/mês) queryável por LLM — atalho se entrar
budget.

## Correções que a pesquisa trouxe

- "Big 4" globais hoje são 3 (ICM foi comprada pela CAA, 2022); Paradigm
  virou Wasserman Music (booking) + TBA/ROAM (ex-agentes).
- Roc Nation no Brasil é braço de FUTEBOL (Vini Jr.), não música.
- Guto Graça Mello era produtor/A&R de trilha de novela, não empresário.
- Boogie Naipe Booking (plataforma aberta da Eliane Dias) é o benchmark
  mais próximo — estudar o fluxo deles como referência de UX.

## Gatekeepers nomeados (públicos, pra dossiê)

Let's GIG: Eduardo Porto, Fernanda Martucci, Gabriela Pompermayer.
Boogie Naipe: Eliane Dias. Talismã: Leonardo e Willian Passarinho.
Agulha: Sapulha Campos + Gustavo Arruda. Casa de Abelha: Júlia
Andreatta + Amanda Rondina. Silëncio: Marina Deeh. SIM: Coy Freitas
(CEO). FIMS: Téo Ruiz + Estrela Leminski. Porto Musical: Melina
Hickson (júri WOMEX 2026). MUCHO!: Hernán Halak + Felipe Gonzalez.
Entourage/Box/Coral: emails shows@/booking@ nos sites.

## Pendências honestas

- Cachê-gatilho que faz escritório BR assinar artista: [INFERIDO] — o
  benchmark lógico é "10% do cachê cobre o tempo do agente".
- Rosters mudam rápido; o seed é snapshot dez/2026 — o dossiê OSINT
  por lead continua sendo a fonte atualizada.
- "Viral → assinou" tem janela de semanas (casos Marina Sena, Ana
  Castela, FloyyMenor) — detecção precoce é o ativo do tracker fase 2.
