import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Que dados o Manager guarda, pra quê, com quem compartilha e como você apaga tudo.",
  alternates: { canonical: "/privacidade" },
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-xl font-semibold text-neutral-50">{children}</h2>;

export default function Privacidade() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 leading-relaxed text-neutral-300 sm:px-6 sm:py-16">
      <h1 className="text-4xl text-neutral-50 sm:text-5xl">Privacidade</h1>
      <p className="mt-4 text-neutral-400">
        Versão de novembro de 2026. Escrito pra ser lido: o que guardamos, por quê, e como você tira daqui.
      </p>

      <H>O que guardamos</H>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><b className="text-neutral-100">Teu perfil:</b> e-mail, nome artístico, tipo de inscrição, áreas, cidade, estado e, se você informar, WhatsApp.</li>
        <li><b className="text-neutral-100">O que você organiza aqui:</b> editais no pipeline, trabalhos e cachês, contratantes, riders, contatos e as conversas com o coach e com a banca simulada.</li>
        <li><b className="text-neutral-100">Documentos que você envia:</b> certidões, documentos de identidade, portfólio e contratos, com a validade que você informar.</li>
      </ul>

      <H>Pra que usamos</H>
      <p className="mt-3">
        Pra fazer o que o produto promete: filtrar os editais que te aceitam, simular a banca com teus dados, te avisar de prazo e de documento vencendo, e gerar teus documentos (rider, proposta, contrato, prestação de contas). Não vendemos teus dados e não usamos pra anúncio.
      </p>

      <H>Com quem compartilhamos</H>
      <p className="mt-3">Só com os serviços que fazem o produto funcionar, e só o necessário pra cada tarefa:</p>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><b className="text-neutral-100">Hospedagem e banco de dados</b> (Vercel e Convex): guardam teus dados e teus arquivos.</li>
        <li><b className="text-neutral-100">Modelos de IA</b> (Google, Groq e OpenAI): recebem o texto da tua conversa com o coach e com a banca, mais o resumo do teu perfil, pra gerar a resposta. Teus arquivos enviados não vão pra eles.</li>
        <li><b className="text-neutral-100">Voz</b> (Agora): transmite o áudio quando você usa o modo de voz.</li>
        <li><b className="text-neutral-100">Pagamento</b> (AbacatePay): recebe nome, e-mail e o CPF que você digita pra gerar o Pix. O CPF não fica guardado no Manager.</li>
        <li><b className="text-neutral-100">Login</b> (WorkOS) e <b className="text-neutral-100">e-mail</b> (Resend): pra você entrar e receber avisos.</li>
        <li><b className="text-neutral-100">Pesquisa de contratantes</b> (Firecrawl): recebe o que você busca (tipo, nicho e cidade), sem teu nome.</li>
        <li><b className="text-neutral-100">Gmail e Google Agenda</b> (via Composio): só se você conectar, e você desconecta quando quiser.</li>
      </ul>

      <H>Teus direitos</H>
      <p className="mt-3">
        Pela LGPD você pode ver, corrigir, levar embora e apagar teus dados. Cada documento tem um botão de apagar na página de documentos, e o arquivo sai do nosso armazenamento na hora. Pra apagar a conta inteira, usa “Apagar minha conta” no menu da conta.
      </p>

      <H>Por quanto tempo</H>
      <p className="mt-3">Enquanto tua conta existir. Apagou a conta, apagamos perfil, registros e arquivos.</p>

      <p className="mt-12 text-sm text-neutral-500">
        Veja também os <Link href="/termos" className="text-emerald-300 underline underline-offset-2">termos de uso</Link>.
      </p>
    </main>
  );
}
