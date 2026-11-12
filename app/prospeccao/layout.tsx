import type { Metadata } from "next";

// Área logada: fora dos buscadores.
export const metadata: Metadata = {
  title: "Prospecção de contratantes",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
