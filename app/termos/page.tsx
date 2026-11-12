import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos de uso",
  description: "As regras de uso do Manager, em português claro.",
  alternates: { canonical: "/termos" },
};

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-10 text-xl font-semibold text-neutral-50">{children}</h2>;

export default function Termos() {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12 leading-relaxed text-neutral-300 sm:px-6 sm:py-16">
      <h1 className="text-4xl text-neutral-50 sm:text-5xl">Termos de uso</h1>
      <p className="mt-4 text-neutral-400">Versão de novembro de 2026.</p>

      <H>O que o Manager é</H>
      <p className="mt-3">
        Uma ferramenta pra organizar carreira artística: radar de editais, simulação de banca, prospecção de contratantes, agenda de cachês e documentos. Ele te prepara; quem inscreve, negocia e assina é você.
      </p>

      <H>O que ele não é</H>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li><b className="text-neutral-100">Não garante aprovação.</b> A nota da sabatina é uma simulação feita por IA pra você se preparar. A decisão é sempre da banca real.</li>
        <li><b className="text-neutral-100">Não substitui o edital.</b> Os dados vêm de portais públicos e podem estar incompletos ou desatualizados. Confere sempre o regulamento oficial no link de cada edital antes de inscrever.</li>
        <li><b className="text-neutral-100">Não é assessoria jurídica nem contábil.</b> Contratos, propostas e relatórios gerados são modelos. Em caso de valor alto ou dúvida, consulta um profissional.</li>
      </ul>

      <H>Tua conta</H>
      <p className="mt-3">Informa dados verdadeiros e cuida do acesso ao teu e-mail. O que você enviar e escrever aqui é teu e continua sendo teu.</p>

      <H>Pagamento</H>
      <p className="mt-3">
        O radar e a primeira sabatina são grátis. A sabatina avulsa e os planos são cobrados pela AbacatePay, por Pix ou cartão. Plano mensal ou anual renova sozinho e você cancela quando quiser, valendo até o fim do período pago. Não cobramos comissão sobre cachê nem sobre recurso de edital.
      </p>

      <H>Uso justo</H>
      <p className="mt-3">Não use o Manager pra enviar spam a contratantes, pra se passar por outra pessoa ou pra inscrever projeto com informação falsa.</p>

      <p className="mt-12 text-sm text-neutral-500">
        Veja também a <Link href="/privacidade" className="text-emerald-300 underline underline-offset-2">política de privacidade</Link>.
      </p>
    </main>
  );
}
