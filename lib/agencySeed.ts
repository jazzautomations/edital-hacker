// Mapa verificado de agências de booking/management e feiras de showcase
// do Brasil — pesquisa OSINT de dez/2026, cada entrada com fonte pública.
// Viram leads prontos no funil (kind agencia | showcase | marketplace).
// NÃO inventar: só entra aqui o que tem fonte verificada.

export interface SeedLead {
  name: string;
  kind: "agencia" | "showcase" | "marketplace";
  city: string;
  uf?: string;
  contact?: string;
  sourceUrl: string;
  fit: string; // quem faz sentido abordar
  notes: string; // gatekeeper nomeado + ângulo de rapport
}

export const AGENCY_SEED: SeedLead[] = [
  // ── Agências de booking/management BR ──────────────────────────────
  {
    name: "Let's GIG",
    kind: "agencia",
    city: "São Carlos",
    uf: "SP",
    contact: "booking@letsgig.com.br",
    sourceUrl: "https://letsgig.com.br",
    fit: "indie/MPB/urbano com show ao vivo forte",
    notes:
      "Sócios públicos: Eduardo Porto, Fernanda Martucci, Gabriela Pompermayer, Ricardo Rodrigues. " +
      "Roster: Luedji Luna, Tuyo, FBC, Tulipa Ruiz, Marcelo Jeneci, Lucas Santtana. ~2.000 shows em todos os continentes. " +
      "Rapport: citar artista do roster próximo do teu som + prova de público.",
  },
  {
    name: "Boogie Naipe Booking",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    contact: "plataforma online",
    sourceUrl: "https://boogienaipe.com.br",
    fit: "hip-hop/rap e urbano — a plataforma de booking é ABERTA pra artista sem estrutura",
    notes:
      "Eliane Dias (CEO) criou o booking digital justamente pra matar o 'me chama no zap'. " +
      "Casa do Racionais/Mano Brown. Caminho: cadastro na plataforma, não email frio. " +
      "É o benchmark mais próximo do nosso produto — estudar o fluxo deles.",
  },
  {
    name: "Talismã Music",
    kind: "agencia",
    city: "São Paulo / Goiânia",
    uf: "SP",
    contact: "contato@talisma.art.br · musica@talisma.art.br (compositores)",
    sourceUrl: "https://talisma.art.br",
    fit: "sertanejo — artista novo e compositor",
    notes:
      "Irmãos Leonardo e Willian Passarinho. Roster: Leonardo, Zé Felipe, Cezar & Paulinho. " +
      "musica@ recebe composições — canal duplo: compositor E artista.",
  },
  {
    name: "Agulha Produções",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    sourceUrl: "https://groover.co",
    fit: "artista novo em SP — especialidade deles é porta de entrada",
    notes:
      "Sapulha Campos + Gustavo Arruda (ex-Plutão Já Foi Planeta). " +
      "200+ artistas novos ajudados; booker + selo. O lead mais acessível da lista pra quem tá começando.",
  },
  {
    name: "Casa de Abelha",
    kind: "agencia",
    city: "São Bernardo do Campo",
    uf: "SP",
    sourceUrl: "https://casadeabelhacultural.com",
    fit: "MPB/voz e violão",
    notes:
      "Júlia Andreatta + Amanda Rondina. Roster: Marina de la Riva, Bruna Caram, Marcos Almeida. " +
      "Produziram showcases no SXSW e Rock in Rio — sabem exportar.",
  },
  {
    name: "Silëncio",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    sourceUrl: "https://mundodamusicamm.com.br",
    fit: "mulheres artistas — foco declarado da casa",
    notes:
      "Fundadora Marina Deeh. Roster: Ayô Tupinambá, Clara Lima, Thalma de Freitas, Stefanie. " +
      "Rapport: a tese deles é corrigir a distorção de gênero no booking — manda material que converse com isso.",
  },
  {
    name: "Rebuliço",
    kind: "agencia",
    city: "Rio de Janeiro",
    uf: "RJ",
    sourceUrl: "https://rebulico.com",
    fit: "black music/MPB RJ",
    notes: "Roster: Buchecha, Simoninha, Tuyo, Jota.Pê, Bruna Black.",
  },
  {
    name: "Nascimento Música",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    sourceUrl: "https://www.linkedin.com/company/nascimento-musica",
    fit: "MPB/rap autoral com obra consolidada",
    notes:
      "Augusto Nascimento (filho adotivo do Milton, advogado). " +
      "Roster peso: Milton Nascimento, Samuel Rosa, Criolo, Djonga. Boutique — abordagem só com obra madura.",
  },
  {
    name: "Agência de Música / BTA",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    sourceUrl: "https://www.billboard.com.br",
    fit: "pop/rock com tração comercial",
    notes:
      "Rafael Rossatto + JV com Bonus Track (irmãos Niemeyer — promoters do Todo Mundo no Rio e MITA). " +
      "Roster: IZA, Di Ferrero, Marcelo Camelo, Capital Inicial, Criolo. 3 frentes: booking + publicidade + gestão.",
  },
  {
    name: "Box Talents",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    contact: "shows@boxtalents.com.br",
    sourceUrl: "https://boxtalents.com.br",
    fit: "eletrônica/DJ",
    notes: "Ecossistema Alok/Illusionize. Assinaram Sevek depois do hit 500M plays — olham dado de streaming.",
  },
  {
    name: "Coral 360",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    contact: "booking@coral360.art",
    sourceUrl: "https://coral360.art",
    fit: "eletrônica/DJ",
    notes: "Booking de DJs + label management.",
  },
  {
    name: "Entourage",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    sourceUrl: "https://entourage.com.br",
    fit: "eletrônica — tier alto (Vintage Culture, Mochakk, ANNA, Beltran)",
    notes:
      "~50 DJs no roster + festivais próprios (Só Track Boa, BOMA, Time Warp BR). " +
      "Só abordar com streaming forte — é topo de cadeia.",
  },
  {
    name: "PlusNetwork",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    sourceUrl: "https://www.linkedin.com/company/plusnetwork",
    fit: "eletrônica mid-tier",
    notes: "Head of bookings: Rafael R. Booking + mgmt + eventos próprios (Skol Beats, E-Zoo BR).",
  },
  {
    name: "K2 Agency",
    kind: "agencia",
    city: "Cruzeiro",
    uf: "SP",
    sourceUrl: "https://k2agency.com.br",
    fit: "bandas independentes — pioneira do booking indie BR",
    notes: "Modelo 'Booking & Social Media' — cobrem a divulgação junto.",
  },
  {
    name: "Criative Music",
    kind: "agencia",
    city: "São Paulo",
    uf: "SP",
    contact: "atendimento3@grupocriative.com",
    sourceUrl: "https://grupocriative.com",
    fit: "gospel — a maior agenciadora gospel da América Latina",
    notes: "+50 artistas gospel, 1.000+ eventos/ano. Roster: Anderson Freire, Fernanda Brum, Aline Barros. WhatsApp no site.",
  },
  {
    name: "Bossa FM",
    kind: "agencia",
    city: "Berlim",
    contact: "info@bossafm.com",
    sourceUrl: "https://bossafm.com",
    fit: "artista BR pronto pra turnê europeia",
    notes: "Turnês europeias de Liniker, Djavan, Criolo. Só com draw internacional comprovado.",
  },
  // ── Feiras de showcase — inscrição GRATUITA que te põe na frente de
  // selos, bookers e programadores. O lead mais barato que existe. ─────
  {
    name: "SIM São Paulo (showcase)",
    kind: "showcase",
    city: "São Paulo",
    uf: "SP",
    contact: "form.simsaopaulo.com (inscrição gratuita, ~abr–jun)",
    sourceUrl: "https://simsaopaulo.com.br",
    fit: "artista autoral com material fonográfico maduro",
    notes:
      "MAIOR feira de música da América Latina (nov/dez). Alumni: Marina Sena, Liniker, Tim Bernardes, Linn da Quebrada. " +
      "Curadoria avalia material + maturidade de carreira — manda o MELHOR registro ao vivo. " +
      "Plateia = selos, diretores de festival, bookers BR + 25 países + speed meetings.",
  },
  {
    name: "Porto Musical (showcase)",
    kind: "showcase",
    city: "Recife",
    uf: "PE",
    contact: "inscrições gratuitas ~mai–jun",
    sourceUrl: "https://portomusical.com.br",
    fit: "independente do eixo NE — principal vitrine da região",
    notes:
      "20 anos. Alumni: Bongar (→ Womex + agência europeia), Radiola Serra Alta (→ Glastonbury), Curumin, Felipe Cordeiro. " +
      "CEO Melina Hickson é júri do WOMEX — o showcase dela é porta pra feira internacional. Rodada de negócios BM&A/ApexBrasil.",
  },
  {
    name: "FIMS / Drops FIMS",
    kind: "showcase",
    city: "Curitiba + edições itinerantes",
    uf: "PR",
    contact: "editais gratuitos regionais + nacional",
    sourceUrl: "https://fims.com.br",
    fit: "artista com estrutura profissional — avaliam 'disposição pra circular', não só arte",
    notes:
      "Selecionado GANHA: cachê R$1,5–2k + ajuda viagem R$2–3k + hostel + rodada de negócios com contratantes. " +
      "Curadores: Téo Ruiz e Estrela Leminski. Cotas: ≥1 vaga cidade-sede, ≥1 América Latina.",
  },
  {
    name: "CoMA Brasília",
    kind: "showcase",
    city: "Brasília",
    uf: "DF",
    contact: "edital gratuito",
    sourceUrl: "https://festivalcoma.com.br",
    fit: "artista DF/entorno (metade das vagas reservada a locais) + nacional",
    notes:
      "Pitches p/ banca de programadores+selos+casas + showcases de 20min. " +
      "Júri misto: jornalistas, músicos e mercado.",
  },
  {
    name: "Rio2C PitchingShow",
    kind: "showcase",
    city: "Rio de Janeiro",
    uf: "RJ",
    contact: "inscrição gratuita (máx 300), ~abr–mai",
    sourceUrl: "https://rio2c.com",
    fit: "NÃO é pra iniciante — pedem maturidade comprovada",
    notes:
      "3 etapas: comissão → 40, direção artística → 12, voto popular → 8 showcases. " +
      "Banca real: programadores de festivais, execs de streaming, BMG, Som Livre, ONErpm, Altafonte. " +
      "Finalistas ganham Rodadas de Negócio.",
  },
  {
    name: "TUM / MUCHO!",
    kind: "showcase",
    city: "Florianópolis / São Paulo",
    uf: "SC",
    sourceUrl: "https://abmi.com.br",
    fit: "cena independente Sul + circuito latino-americano",
    notes:
      "TUM (Floripa, nov): ABMI co-curadora ~50% do lineup. " +
      "MUCHO! (SP): curadores Hernán Halak + Felipe Gonzalez VIAJAM feiras fazendo scouting — ser visto ao vivo conta mais que email.",
  },
  {
    name: "WOMEX",
    kind: "showcase",
    city: "cidade rotativa internacional",
    contact: "call anual €15–25 em womex.com",
    sourceUrl: "https://womex.com",
    fit: "pronto pro circuito internacional de turnês (newcomer)",
    notes:
      "Júri independente de 5. NÃO cobre viagem/cachê — BR entra via BM&A/ApexBrasil. " +
      "Exige: bio, MP3s, rider técnico, stage plan, vídeo ao vivo, histórico de turnê — o Manager gera quase tudo isso.",
  },
  // ── Marketplaces (intermediário, não roster) ───────────────────────
  {
    name: "Musicasting",
    kind: "marketplace",
    city: "nacional",
    sourceUrl: "https://musicasting.com.br",
    fit: "qualquer artista — lista escritório/contato por artista",
    notes: "Diretório público de quem representa quem — fonte de OSINT pra achar o empresário de artistas parecidos contigo.",
  },
  {
    name: "Compre Shows",
    kind: "marketplace",
    city: "nacional",
    sourceUrl: "https://compreshows.com.br",
    fit: "contratação direta cidade a cidade",
    notes: "Marketplace de contratação — preenche agenda sem depender de agência.",
  },
];

// Regras de negociação verificadas — injetadas na memória do coach.
export const AGENCY_INTEL = [
  "Escritório sertanejo/360 BR cobra ~50% do cachê em contrato de 5–10 ANOS com multa milionária (AudioMix pediu R$31M a Jorge & Mateus). Manager global: 15–20% do gross. Booking: ~10% do cachê do show. Agente legítimo NUNCA cobra upfront pra assinar.",
  "Regra de mercado: só procura agência quando consegue ESGOTAR show na cidade natal — draw comprovável é o que abre porta ('don't call us, we'll call you'). Antes disso, o trabalho é encher casa e documentar.",
  "O destino dos grandes é empresa própria: Anitta (Rodamoinho), Ivete (IESSI), Ludmilla (Sem Querer), Luan (LS Music), Safadão (Camarote) — todos saíram de escritório quando ganharam leverage. O Manager é essa estrutura de prateleira por R$9,90, não mais 50% do cachê.",
  "Abordagem em agência: EPK + prova de momentum (charts, listeners, sold-out, menções) + convite pro próximo show — booker só fecha depois de VER ao vivo. Warm intro de outro artista/produtor vale 10x email frio.",
];
