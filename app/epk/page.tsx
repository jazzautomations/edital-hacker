"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

// EPK (press kit) vivo — link que o artista manda pro booker.
// Ordem canônica do mercado: quem é → ouça → assista → bio → agenda → contato.
// Sem cachê público: formatos e valor se resolvem na conversa (proposta PDF).

type Gig = { _id: string; title: string; venue?: string; date: string; status: string };

function EpkInner() {
  const email = useSearchParams().get("email") ?? "";
  const profile = useQuery(api.profiles.getByEmail, email ? { email } : "skip") as any;
  const gigs = useQuery(
    api.gigs.listForProfile,
    profile ? { profileId: profile._id } : "skip"
  ) as Gig[] | undefined;

  if (!email) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <p className="text-neutral-400">EPK não encontrado — falta o email do artista na URL.</p>
      </main>
    );
  }
  if (profile === undefined) {
    return <main className="mx-auto flex min-h-screen items-center justify-center"><p className="text-neutral-500">carregando…</p></main>;
  }
  if (profile === null) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <p className="text-neutral-400">Nenhum artista com esse email por aqui.</p>
      </main>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...(gigs ?? [])]
    .filter((g) => g.date >= today && g.status !== "cancelado")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 print:py-4">
      {/* 1. Header — quem é */}
      <header className="mb-10 flex items-start gap-6">
        {profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.photoUrl} alt={profile.name} className="h-28 w-28 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-emerald-500/10 text-4xl">🎤</div>
        )}
        <div>
          <h1 className="text-4xl tracking-tight text-neutral-50">{profile.name}</h1>
          <p className="mt-1 text-lg text-emerald-400">
            {profile.tagline ?? `${profile.personType}${profile.city || profile.uf ? ` · ${[profile.city, profile.uf].filter(Boolean).join("/")}` : ""}`}
          </p>
          {profile.artAreas?.length > 0 && (
            <p className="mt-1 font-mono text-xs uppercase text-neutral-500">{profile.artAreas.join(" · ")}</p>
          )}
        </div>
      </header>

      {/* 2. Ouça */}
      {profile.musicLinks?.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-emerald-400">Ouça</h2>
          <div className="flex flex-col gap-2">
            {profile.musicLinks.map((l: string, i: number) => (
              <a key={i} href={l} target="_blank" rel="noreferrer" className="truncate rounded-xl border border-neutral-800 px-4 py-3 text-sm hover:border-emerald-500/50">
                ▶ {l.replace(/^https?:\/\//, "").slice(0, 60)}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 3. Assista — o vídeo ao vivo é o item nº 1 do booker */}
      {profile.videoUrl && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-emerald-400">Assista ao vivo</h2>
          <a href={profile.videoUrl} target="_blank" rel="noreferrer" className="block rounded-2xl border border-neutral-800 p-5 text-center hover:border-emerald-500/50">
            <span className="text-3xl">🎬</span>
            <p className="mt-2 text-sm text-neutral-300">Ver apresentação ao vivo</p>
          </a>
        </section>
      )}

      {/* 4. Bio */}
      {profile.bio && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-emerald-400">Sobre</h2>
          <p className="whitespace-pre-line leading-relaxed text-neutral-300">{profile.bio}</p>
        </section>
      )}

      {/* 5. Agenda — prova de demanda */}
      {upcoming.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-emerald-400">Próximas datas</h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((g) => (
              <div key={g._id} className="flex items-center gap-4 rounded-xl border border-neutral-800 px-4 py-3">
                <span className="font-mono text-sm text-emerald-400">{g.date}</span>
                <span className="text-sm">{g.title}{g.venue ? ` — ${g.venue}` : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6. Links + contato de booking */}
      <section className="mb-10">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-emerald-400">Booking & contato</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <a href={`mailto:${profile.email}?subject=Booking%20-%20${encodeURIComponent(profile.name)}`} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-black">
            ✉ {profile.email}
          </a>
          {profile.phone && (
            <a href={`https://wa.me/${profile.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-xl border border-neutral-800 px-5 py-3">
              💬 WhatsApp
            </a>
          )}
          {profile.portfolioUrl && (
            <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-neutral-800 px-5 py-3">
              🔗 Portfólio
            </a>
          )}
        </div>
      </section>

      <footer className="border-t border-neutral-900 pt-6 text-center">
        <p className="font-mono text-[10px] text-neutral-600">
          Press kit gerado pelo Manager — o coach de IA do trabalhador da arte · atualizado em {today}
        </p>
      </footer>
    </main>
  );
}

export default function EpkPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-screen items-center justify-center"><p className="text-neutral-500">carregando…</p></main>}>
      <EpkInner />
    </Suspense>
  );
}
