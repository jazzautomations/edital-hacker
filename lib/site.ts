export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://editalhacker.jazzautomations.com.br").replace(/\/$/, "");
export const SITE_NAME = "Manager";
export const SITE_TAGLINE = "Você cuida da arte. O Manager cuida da renda.";
export const SITE_DESCRIPTION =
  "Radar de editais de cultura abertos, sabatina com banca simulada, prospecção de shows e controle de cachês. O manager de carreira com IA pra músicos, produtores e trabalhadores da arte.";

/** Open Graph completo pra uma página. O Next NÃO mescla este bloco com o do
 *  layout raiz: quem define `openGraph` precisa repetir imagem, site e idioma. */
export function og(title: string, description: string, url: string) {
  return {
    type: "website" as const,
    locale: "pt_BR",
    siteName: SITE_NAME,
    title,
    description,
    url,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Manager: você cuida da arte, o Manager cuida da renda" }],
  };
}
