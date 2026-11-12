import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Criar perfil grátis",
  description: "Monta teu perfil de artista em 1 minuto e recebe os editais de cultura que combinam com tua área, teu estado e teu tipo de inscrição.",
  alternates: { canonical: "/comecar" },
  openGraph: { title: "Criar perfil grátis", description: "Monta teu perfil de artista em 1 minuto e recebe os editais de cultura que combinam com tua área, teu estado e teu tipo de inscrição.", url: "/comecar" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
