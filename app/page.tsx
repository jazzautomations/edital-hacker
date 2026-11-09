import Link from "next/link";

const stats: Array<[string, string]> = [
  [
    "R$ 15 bi",
    "da PNAB descentralizados para estados e municípios — o dinheiro existe, falta quem ache",
  ],
  [
    "15h/mês",
    "é o que um artista gasta caçando edital em portais espalhados — em vez de produzir",
  ],
  [
    "32%",
    "dos trabalhadores da arte apontam “encontrar empresário” como a maior dificuldade da carreira",
  ],
  [
    "110",
    "editais vivos agora no radar, lidos de 45+ instâncias Mapas Culturais e fontes municipais",
  ],
];

const pillars = [
  {
    tag: "01 · base",
    title: "Radar de editais + sabatina de banca",
    body: "O radar varre a rede federada e traz só o que combina com o seu perfil. Antes de inscrever, a sabatina te entrevista — projeto, repertório, orçamento — contra a rubrica real do edital e devolve um score de 0 a 100 com o que a banca vai questionar. Preparar, não escrever: a proposta continua sua.",
    href: "/oportunidades",
    cta: "Abrir o radar →",
  },
  {
    tag: "02 · audiência",
    title: "Prospecção de gigs e contratantes",
    body: "Casas de show, festivais, marcas e escolas no seu nicho e na sua cidade, com funil próprio do primeiro contato ao fechado. Edital é sazonal; agenda de gig não pode ser.",
    href: "/prospeccao",
    cta: "Caçar leads →",
  },
  {
    tag: "03 · venda",
    title: "Agenda & cachês",
    body: "Cada data, contrato e pagamento com status claro: pago, pendente, atrasado. Você sabe quanto entra no mês antes de o mês começar — e cobra quem atrasou.",
    href: "/agenda",
    cta: "Ver minha agenda →",
  },
  {
    tag: "04 · entrega orientada",
    title: "Pipeline de carreira",
    body: "Inscrições, propostas e negociações num funil só: recurso captado, cachê a receber, próxima entrega. Tudo medido em reais — nada de métrica de vaidade.",
    href: "/pipeline",
    cta: "Ver o pipeline →",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-center gap-20 px-6 py-20">
      {/* hero — a promessa do coach */}
      <section className="flex flex-col items-center gap-5 pt-6 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400">
          manager_ · coach de carreira para trabalhadores da arte
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
          Você cuida da arte. O Manager cuida da{" "}
          <span className="text-emerald-400">renda</span>.
        </h1>
        <p className="max-w-2xl text-lg text-neutral-400">
          Editais, gigs privados e financiamento de fãs são fontes da mesma
          renda. O Manager organiza todas: caça as oportunidades certas, sabatina
          você contra a rubrica real da banca e controla cada cachê — para
          músicos, produtores e professores de arte que não querem mais esperar
          empresário, gravadora ou produtor.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/coach"
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black transition hover:bg-emerald-400"
          >
            Falar com o Coach →
          </Link>
          <Link
            href="/oportunidades"
            className="rounded-xl border border-neutral-700 px-6 py-3 font-semibold transition hover:border-neutral-500"
          >
            Radar de editais — grátis
          </Link>
          <Link
            href="/assinatura"
            className="text-sm text-neutral-400 underline-offset-4 transition hover:text-emerald-400 hover:underline"
          >
            Sabatinar proposta · R$ 9,90
          </Link>
        </div>
      </section>

      {/* prova numérica — medida em reais e em horas devolvidas */}
      <section className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([num, label]) => (
          <div
            key={num}
            className="rounded-2xl border border-neutral-800 p-5 text-center"
          >
            <p className="text-2xl font-bold text-emerald-400">{num}</p>
            <p className="mt-1 text-sm text-neutral-400">{label}</p>
          </div>
        ))}
      </section>

      {/* os quatro pilares — na progressão do método */}
      <section className="flex w-full flex-col gap-8 border-t border-neutral-800 pt-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-500">
            o método
          </p>
          <h2 className="max-w-2xl text-2xl font-bold md:text-3xl">
            Um coach. Quatro pilares. Nenhuma fonte de renda deixada na mesa.
          </h2>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-neutral-500">
            <span className="text-emerald-400">b</span>ase ·{" "}
            <span className="text-emerald-400">r</span>epertório ·{" "}
            <span className="text-emerald-400">a</span>udiência ·{" "}
            <span className="text-emerald-400">v</span>enda · entrega{" "}
            <span className="text-emerald-400">o</span>rientada
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pillars.map((p) => (
            <Link
              key={p.tag}
              href={p.href}
              className="group rounded-2xl border border-neutral-800 p-6 transition hover:border-emerald-700"
            >
              <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-400">
                {p.tag}
              </p>
              <h3 className="mt-3 text-xl font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                {p.body}
              </p>
              <p className="mt-4 text-sm font-semibold text-emerald-400 opacity-80 transition group-hover:opacity-100">
                {p.cta}
              </p>
            </Link>
          ))}
        </div>

        {/* arsenal — os documentos que mentoria vende, gerados em 1 clique */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            o arsenal do coach:
          </span>
          {[
            ["Rider técnico", "/rider"],
            ["Press kit (EPK)", "/epk"],
            ["Prestação de contas", "/prestacao"],
            ["Agenda & cachês", "/agenda"],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full border border-neutral-800 px-4 py-1.5 text-xs text-neutral-400 transition hover:border-emerald-500/60 hover:text-emerald-300"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* CTA duplo */}
      <section className="flex w-full flex-col items-center gap-5 rounded-3xl border border-emerald-900/60 bg-emerald-950/20 px-6 py-12 text-center">
        <h2 className="max-w-2xl text-2xl font-bold md:text-3xl">
          Sua próxima fonte de renda já está aberta.
        </h2>
        <p className="max-w-xl text-neutral-400">
          O radar é grátis. A sabatina custa menos que uma corda de violão — e o
          coach não tira férias nem cobra comissão de show.
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/oportunidades"
            className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black transition hover:bg-emerald-400"
          >
            Entrar no radar — grátis →
          </Link>
          <Link
            href="/assinatura"
            className="rounded-xl border border-neutral-700 px-6 py-3 font-semibold transition hover:border-neutral-500"
          >
            Sabatinar uma proposta · R$ 9,90
          </Link>
        </div>
        <p className="font-mono text-xs text-neutral-500">
          sem promessa de aprovação · promessa de preparo
        </p>
      </section>
    </main>
  );
}
