import { Suspense } from "react";
import { cacheLife } from "next/cache";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Opportunity } from "@/lib/types";
import { viewOf } from "@/lib/opp";
import { SITE_URL } from "@/lib/site";
import SabatinaClient from "./SabatinaClient";

// O dado do edital muda pouco: cache de 1 hora.
async function getOpp(id: string): Promise<Opportunity | null> {
  "use cache";
  cacheLife("hours");
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
    return (await convex.query(api.opportunities.get, { id: id as never })) as Opportunity | null;
  } catch {
    return null;
  }
}

// Título e descrição próprios de cada edital, pro Google e pro link
// compartilhado. O React 19 sobe <title>/<meta>/<link> pro <head>.
// (generateMetadata lendo `params` é barrado pela validação de pré-render do
// Cache Components nesta versão do Next, então as tags saem daqui.)
async function EditalHead({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const opp = await getOpp(id);
  if (!opp) return <meta name="robots" content="noindex" />;
  const v = viewOf(opp);
  const prazo = opp.registrationTo
    ? ` Inscrições até ${new Date(opp.registrationTo).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`
    : "";
  const short = v.title.length > 62 ? `${v.title.slice(0, 60).trimEnd()}…` : v.title;
  const description = `${v.publisher}.${prazo} ${v.summary}`.replace(/\s+/g, " ").trim().slice(0, 158);
  const url = `${SITE_URL}/sabatina/${id}`;
  return (
    <>
      <title>{`${short} · Manager`}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={v.title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="article" />
      <meta property="og:image" content={`${SITE_URL}/og.png`} />
    </>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <>
      <Suspense fallback={null}>
        <EditalHead params={params} />
      </Suspense>
      <Suspense fallback={<main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6" aria-busy="true" />}>
        <SabatinaClient params={params} />
      </Suspense>
    </>
  );
}
