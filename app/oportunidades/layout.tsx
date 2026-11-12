import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editais de cultura abertos hoje",
  description: "Radar de editais, prêmios e chamadas públicas de cultura com inscrição aberta: PNAB, Mapas Culturais, estados e prefeituras. Filtra por área, estado e prazo.",
  alternates: { canonical: "/oportunidades" },
  openGraph: { title: "Editais de cultura abertos hoje", description: "Radar de editais, prêmios e chamadas públicas de cultura com inscrição aberta: PNAB, Mapas Culturais, estados e prefeituras. Filtra por área, estado e prazo.", url: "/oportunidades" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
