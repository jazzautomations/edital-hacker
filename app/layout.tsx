import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Manager — o coach de IA do trabalhador da arte",
  description:
    "Radar de editais, sabatina contra a banca real, prospecção de gigs e agenda de cachês: o coach de IA que organiza em reais a renda de músicos, produtores e trabalhadores da arte.",
  openGraph: {
    title: "Manager — o coach de IA do trabalhador da arte",
    description:
      "Radar de editais, sabatina contra a banca real, prospecção de gigs e agenda de cachês. Você cuida da arte; o Manager cuida da renda.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-950 text-neutral-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
