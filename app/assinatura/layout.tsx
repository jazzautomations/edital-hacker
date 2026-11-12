import type { Metadata } from "next";
import { og } from "@/lib/site";

export const metadata: Metadata = {
  title: "Planos e preços",
  description: "Radar de editais e a primeira sabatina são grátis. Manager a partir de R$ 39,90 por mês no plano anual, ou R$ 9,90 por edital no Pix. Sem comissão sobre cachê.",
  alternates: { canonical: "/assinatura" },
  openGraph: og("Planos e preços", "Radar de editais e a primeira sabatina são grátis. Manager a partir de R$ 39,90 por mês no plano anual, ou R$ 9,90 por edital no Pix. Sem comissão sobre cachê.", "/assinatura"),
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
