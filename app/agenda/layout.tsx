import type { Metadata } from "next";

// Área logada: fora dos buscadores.
export const metadata: Metadata = {
  title: "Agenda e cachês",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
