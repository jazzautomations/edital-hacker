import type { Metadata } from "next";
import Link from "next/link";
import { SITE_DESCRIPTION, SITE_URL, og } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: og("Manager: editais de cultura, shows e cachês num lugar só", SITE_DESCRIPTION, "/"),
};

const faq: Array<[string, string]> = [
  [
    "O Manager escreve o projeto do edital por mim?",
    "Não. Ele acha os editais que te aceitam, te entrevista como a banca faria e mostra o que falta. A proposta continua sendo tua, que é o que a banca quer ler.",
  ],
  [
    "Quanto custa?",
    "O radar de editais e a primeira sabatina são grátis. Depois, R$ 9,90 por edital no Pix, ou plano a partir de R$ 39,90 por mês no anual. Não cobramos comissão sobre cachê nem sobre recurso aprovado.",
  ],
  [
    "De onde vêm os editais?",
    "De portais públicos de cultura: Mapas Culturais federal, estaduais e municipais, e o portal nacional de contratações públicas. O radar varre as fontes todo dia e cada edital tem o link pro original.",
  ],
  [
    "Serve pra quem não é músico?",
    "Serve. Teatro, dança, audiovisual, artes visuais, literatura, circo, cultura popular, produção e técnica. No cadastro você marca tua área e o radar passa a ordenar por ela.",
  ],
  [
    "Meus documentos ficam seguros?",
    "Ficam guardados só na tua conta, pra você anexar em edital e ser avisado antes de vencer. Você apaga quando quiser e a gente não compartilha com ninguém.",
  ],
];

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Manager",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      inLanguage: "pt-BR",
      offers: [
        { "@type": "Offer", name: "Grátis", price: "0", priceCurrency: "BRL" },
        { "@type": "Offer", name: "Sabatina avulsa", price: "9.90", priceCurrency: "BRL" },
        { "@type": "Offer", name: "Manager mensal", price: "49.90", priceCurrency: "BRL" },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ],
};

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
    "150+",
    "editais vivos no radar agora, de 13 fontes: Mapas federais, estaduais, PNCP e o long tail municipal do PNAB",
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

function VerdictPreview() {
  const rows: Array<[string, number]> = [
    ["Qualificação do proponente", 8],
    ["Planejamento e orçamento", 4],
    ["Impacto e relevância", 7],
    ["Mérito e coerência", 9],
  ];
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-emerald-500/10 blur-3xl" aria-hidden />
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900/80 p-6 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
            parecer da banca · simulado
          </p>
          <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300">
            PNAB · fomento
          </span>
        </div>
        <div className="mt-4 flex items-end gap-3">
          <p className="font-display text-7xl leading-none text-emerald-300">72</p>
          <p className="pb-2 text-sm text-neutral-400">/100 · passa no corte, mas por pouco</p>
        </div>
        <div className="mt-5 space-y-2.5">
          {rows.map(([label, n]) => (
            <div key={label}>
              <div className="flex justify-between text-xs">
                <span className="text-neutral-300">{label}</span>
                <span className={`font-mono ${n <= 5 ? "text-amber-400" : "text-neutral-400"}`}>{n}/10</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-neutral-800">
                <div
                  className={`h-1.5 rounded-full ${n <= 5 ? "bg-amber-400" : "bg-emerald-400"}`}
                  style={{ width: `${n * 10}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200">
          <b className="font-semibold">A banca vai cobrar:</b> orçamento global sem itemização e
          contrapartida que repete o objeto. Arruma isso antes de inscrever.
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-24 px-4 pb-24 pt-12 sm:px-6 sm:pt-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* hero */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col gap-6">
          <p className="inline-flex w-fit items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Coach de carreira para trabalhadores da arte
          </p>
          <h1 className="text-[3.25rem] text-neutral-50 sm:text-7xl">
            Você cuida da arte. O Manager cuida da{" "}
            <em className="text-emerald-300">renda.</em>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-neutral-400">
            Editais, gigs e cachês numa conta só. O Manager acha as oportunidades
            certas, te sabatina contra a rubrica real da banca e cobra quem
            atrasou o pagamento. Pra quem cansou de esperar empresário,
            gravadora ou produtor.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/comecar"
              className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              Começar grátis
            </Link>
            <Link
              href="/oportunidades"
              className="rounded-full border border-neutral-700 px-6 py-3 font-semibold text-neutral-100 hover:border-neutral-500 hover:bg-neutral-900"
            >
              Ver editais abertos
            </Link>
          </div>
          <p className="text-sm text-neutral-500">
            Sabatina avulsa por R$ 9,90 no Pix · sem comissão sobre cachê
          </p>
        </div>
        <div className="flex justify-center lg:justify-end">
          <VerdictPreview />
        </div>
      </section>

      {/* números */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-800 lg:grid-cols-4">
        {stats.map(([num, label]) => (
          <div key={num} className="bg-neutral-950 p-6">
            <p className="font-display text-4xl text-neutral-50 sm:text-5xl">{num}</p>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">{label}</p>
          </div>
        ))}
      </section>

      {/* pilares */}
      <section className="flex flex-col gap-10">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-400">o método</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-neutral-50 sm:text-5xl">
            Um coach, quatro frentes. Nenhuma renda esquecida na mesa.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {pillars.map((p, i) => (
            <Link
              key={p.tag}
              href={p.href}
              className="group flex flex-col rounded-3xl border border-neutral-800 bg-neutral-900/40 p-7 hover:border-emerald-500/50 hover:bg-neutral-900"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-5xl text-neutral-700 group-hover:text-emerald-400">
                  0{i + 1}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-500">
                  {p.tag.split("·")[1]?.trim()}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-semibold text-neutral-50">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-400">{p.body}</p>
              <p className="mt-6 text-sm font-semibold text-emerald-400">{p.cta}</p>
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm text-neutral-500">Documentos em 1 clique:</span>
          {[
            ["Rider técnico", "/rider"],
            ["Press kit (EPK)", "/agenda"],
            ["Prestação de contas", "/prestacao"],
            ["Agenda & cachês", "/agenda"],
          ].map(([label, href]) => (
            <Link
              key={label}
              href={href}
              className="rounded-full border border-neutral-800 px-4 py-1.5 text-sm text-neutral-300 hover:border-emerald-500/60 hover:text-emerald-300"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* perguntas */}
      <section className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-emerald-400">antes de começar</p>
          <h2 className="mt-3 font-display text-4xl leading-tight text-neutral-50 sm:text-5xl">Perguntas que todo artista faz.</h2>
        </div>
        <div className="flex flex-col divide-y divide-neutral-800 border-y border-neutral-800">
          {faq.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold text-neutral-50 [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="text-2xl font-normal text-neutral-500 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-2xl leading-relaxed text-neutral-400">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900 px-6 py-16 text-center sm:px-12">
        <div className="absolute inset-x-0 -top-40 -z-0 mx-auto h-80 w-[40rem] max-w-full rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
        <div className="relative flex flex-col items-center gap-5">
          <h2 className="max-w-2xl font-display text-4xl leading-tight text-neutral-50 sm:text-6xl">
            Sua próxima fonte de renda <em className="text-emerald-300">já está aberta.</em>
          </h2>
          <p className="max-w-xl text-neutral-400">
            O radar é grátis. A sabatina custa menos que uma corda de violão, e o
            coach não tira férias nem cobra comissão de show.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/comecar"
              className="rounded-full bg-emerald-400 px-6 py-3 font-semibold text-neutral-950 hover:bg-emerald-300"
            >
              Criar meu perfil
            </Link>
            <Link
              href="/assinatura"
              className="rounded-full border border-neutral-700 px-6 py-3 font-semibold hover:border-neutral-500"
            >
              Ver planos
            </Link>
          </div>
          <p className="font-mono text-xs text-neutral-500">sem promessa de aprovação · promessa de preparo</p>
        </div>
      </section>
    </main>
  );
}
