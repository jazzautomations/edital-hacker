import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Press kit",
  description: "Press kit do artista: release, links, contato de booking e ficha técnica.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
