"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { api } from "@/convex/_generated/api";
import { useAuthEmail } from "@/lib/useAuth";
import { useMyProfile } from "@/lib/useProfile";
import type { Profile } from "@/lib/types";
import { EmailCodeForm } from "@/components/EmailCodeForm";
import { Button, Field, Input, Select, Skeleton } from "@/components/ui";

const PERSON_TYPES = [
  { id: "Pessoa Física", title: "Pessoa física", hint: "Me inscrevo com meu CPF" },
  { id: "MEI", title: "MEI", hint: "Tenho CNPJ de microempreendedor" },
  { id: "Pessoa Jurídica", title: "Empresa ou associação", hint: "CNPJ de produtora, ME, OSC" },
  { id: "Coletivo sem CNPJ", title: "Coletivo sem CNPJ", hint: "Grupo informal, alguém representa" },
];

const AREAS = [
  "Música", "Teatro", "Dança", "Audiovisual", "Artes visuais", "Literatura", "Circo",
  "Cultura popular", "Produção cultural", "Técnica de palco", "Ensino de arte", "DJ",
];

const GOALS = [
  { id: "editais", title: "Ganhar editais", hint: "Achar os certos e chegar pronto na banca" },
  { id: "gigs", title: "Fechar mais shows e trabalhos", hint: "Casas, festivais, marcas e escolas" },
  { id: "caches", title: "Receber cachê em dia", hint: "Saber quanto entra e cobrar atraso" },
  { id: "documentos", title: "Organizar meus documentos", hint: "Certidões, portfólio e contratos num lugar só" },
];

const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

const STEPS = ["Quem é você", "O que você faz", "Onde atua", "Tua trajetória", "Tua formação", "Teu objetivo"];

const STAGES = [
  { id: "comecando", title: "Tô começando", hint: "Poucos shows, ainda montando repertório e material" },
  { id: "circulando", title: "Já circulo", hint: "Faço shows com frequência, quero crescer e profissionalizar" },
  { id: "consolidado", title: "Carreira consolidada", hint: "Agenda cheia, quero escala, editais grandes e agência" },
];
const blankMember = () => ({ name: "", role: "", phone: "" });

function Choice({
  selected,
  onClick,
  title,
  hint,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left ${
        selected
          ? "border-emerald-400 bg-emerald-400/10"
          : "border-neutral-800 bg-neutral-900/50 hover:border-neutral-600"
      }`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${
          selected ? "border-emerald-400 bg-emerald-400 text-neutral-950" : "border-neutral-600 text-transparent"
        }`}
      >
        ✓
      </span>
      <span>
        <span className="block font-semibold text-neutral-50">{title}</span>
        {hint && <span className="mt-0.5 block text-sm text-neutral-400">{hint}</span>}
      </span>
    </button>
  );
}

function Onboarding() {
  const router = useRouter();
  const params = useSearchParams();
  const back = params.get("voltar");
  const { email, token, ready } = useAuthEmail();
  const hasEmail = Boolean(email);
  const profile = useMyProfile();
  const upsert = useMutation(api.profiles.upsert);

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [personType, setPersonType] = useState("Pessoa Física");
  const [areas, setAreas] = useState<string[]>([]);
  const [otherArea, setOtherArea] = useState("");
  const [city, setCity] = useState("");
  const [uf, setUf] = useState("");
  const [phone, setPhone] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [insta, setInsta] = useState("");
  const [music, setMusic] = useState("");
  const [site, setSite] = useState("");
  const [stage, setStage] = useState("");
  const [wonEdital, setWonEdital] = useState<boolean | null>(null);
  const [solo, setSolo] = useState(false);
  const [team, setTeam] = useState([blankMember(), blankMember()]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  // ao salvar, o perfil vira "onboarded" na hora e o efeito abaixo redirecionaria
  // sem o ?bemvindo — quem redireciona nesse caso é o finish()
  const finishing = useRef(false);

  const safeBack = back && back.startsWith("/") && !back.startsWith("//") && !back.startsWith("/comecar") ? back : "/inicio";

  // quem já tem perfil completo não refaz o onboarding; perfil antigo vem pré-preenchido
  useEffect(() => {
    if (!profile || prefilled || finishing.current) return;
    if (profile.onboardedAt) {
      router.replace(safeBack);
      return;
    }
    setPrefilled(true);
    const looksAuto = profile.name === profile.email.split("@")[0];
    if (!looksAuto) setName(profile.name);
    if (profile.personType) setPersonType(profile.personType);
    if (profile.artAreas?.length) setAreas(profile.artAreas);
    if (profile.city) setCity(profile.city);
    if (profile.uf) setUf(profile.uf);
    if (profile.phone) setPhone(profile.phone);
    const pp = profile as Profile & { team?: { name: string; role?: string; phone?: string }[]; stage?: string };
    if (pp.team?.length) setTeam(pp.team.map((m) => ({ name: m.name, role: m.role ?? "", phone: m.phone ?? "" })));
    if (pp.stage) setStage(pp.stage);
  }, [profile, prefilled, router, safeBack]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const allAreas = [...areas, ...(otherArea.trim() ? [otherArea.trim()] : [])];
  const canNext =
    step === 0 ? name.trim().length >= 2
    : step === 1 ? allAreas.length > 0
    : step === 2 ? city.trim().length >= 2 && uf
    : step === 3 ? Boolean(stage)
    : step === 4 ? true
    : goals.length > 0;

  // @fulano → link do Instagram; o resto vira URL com https
  const asUrl = (raw: string, kind?: "insta") => {
    const t = raw.trim();
    if (!t) return null;
    if (kind === "insta" && !t.includes(".")) return `https://www.instagram.com/${t.replace(/^@/, "")}/`;
    return /^https?:\/\//.test(t) ? t : `https://${t}`;
  };

  async function finish() {
    finishing.current = true;
    setSaving(true);
    setErr(null);
    try {
      await upsert({
        token,
        name: name.trim(),
        personType,
        artAreas: Array.from(new Set(allAreas)),
        city: city.trim(),
        uf,
        phone: phone.trim() || undefined,
        goals,
        stage: stage || undefined,
        wonEdital: wonEdital ?? undefined,
        socialLinks: [asUrl(insta, "insta"), asUrl(music), asUrl(site)].filter((x): x is string => Boolean(x)),
        portfolioUrl: asUrl(site) ?? undefined,
        team: solo ? [] : team.filter((m) => m.name.trim()).map((m) => ({ name: m.name.trim(), role: m.role.trim() || undefined, phone: m.phone.trim() || undefined })),
        onboarded: true,
      });
      router.replace(safeBack === "/inicio" ? "/inicio?bemvindo=1" : safeBack);
    } catch (e) {
      setErr("Não consegui salvar agora. Confere a conexão e tenta de novo.");
      finishing.current = false;
      setSaving(false);
    }
  }

  if (!ready || (hasEmail && profile === undefined) || profile?.onboardedAt) {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-16 sm:px-6" aria-busy="true">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64" />
      </main>
    );
  }

  // passo zero: ainda não sabemos quem é
  if (!hasEmail) {
    return (
      <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-emerald-400">Começar</p>
        <h1 className="mt-3 text-4xl text-neutral-50 sm:text-5xl">Monta teu perfil em 1 minuto.</h1>
        <p className="mt-3 text-base leading-relaxed text-neutral-400">
          Com ele o Manager filtra só os editais que te aceitam e prepara a banca pro teu caso.
        </p>
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
          <EmailCodeForm cta="Começar" hint="Mando um código de 6 números pra confirmar que o e-mail é teu." />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-3.5rem)] w-full max-w-xl flex-col px-4 py-10 sm:px-6 sm:py-14">
      {/* progresso */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-xs text-neutral-500">
          <span>
            Passo {step + 1} de {STEPS.length} · <span className="text-neutral-300">{STEPS[step]}</span>
          </span>
          <span className="truncate pl-4">{email}</span>
        </div>
        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Progresso do cadastro"
        >
          {STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-emerald-400" : "bg-neutral-800"}`} />
          ))}
        </div>
      </div>

      <form
        className="flex flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canNext || saving) return;
          if (step < STEPS.length - 1) setStep(step + 1);
          else void finish();
        }}
      >
        <div className="flex-1">
          {step === 0 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl text-neutral-50 sm:text-5xl">Como o público te conhece?</h1>
                <p className="mt-3 text-neutral-400">É o nome que vai nas propostas, no rider e no press kit.</p>
              </div>
              <Field label="Nome artístico ou do grupo">
                <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lia Monteiro, Trio Maré" autoComplete="nickname" />
              </Field>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm font-medium text-neutral-200">Como você se inscreve em edital?</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PERSON_TYPES.map((t) => (
                    <Choice key={t.id} selected={personType === t.id} onClick={() => setPersonType(t.id)} title={t.title} hint={t.hint} />
                  ))}
                </div>
                <p className="text-xs text-neutral-500">Muito edital só aceita um tipo. O radar usa isso pra te avisar antes.</p>
              </fieldset>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl text-neutral-50 sm:text-5xl">O que você faz?</h1>
                <p className="mt-3 text-neutral-400">Marca tudo que vale. Dá pra mudar depois.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {AREAS.map((a) => {
                  const on = areas.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(areas, setAreas, a)}
                      className={`rounded-full border px-4 py-2 text-sm ${
                        on ? "border-emerald-400 bg-emerald-400 font-semibold text-neutral-950" : "border-neutral-700 text-neutral-200 hover:border-neutral-500"
                      }`}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
              <Field label="Outra área" hint="Opcional. Ex.: capoeira, lutheria, iluminação.">
                <Input value={otherArea} onChange={(e) => setOtherArea(e.target.value)} placeholder="Escreve aqui" />
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl text-neutral-50 sm:text-5xl">Onde você atua?</h1>
                <p className="mt-3 text-neutral-400">Edital municipal e estadual exige residência. A prospecção também começa pela tua cidade.</p>
              </div>
              <div className="grid grid-cols-[1fr_7rem] gap-3">
                <Field label="Cidade">
                  <Input autoFocus value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex.: Campinas" autoComplete="address-level2" />
                </Field>
                <Field label="Estado">
                  <Select value={uf} onChange={(e) => setUf(e.target.value)} aria-label="Estado">
                    <option value="">UF</option>
                    {UFS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="WhatsApp" hint="Opcional. Só pra te avisar de prazo fechando e cachê atrasado.">
                <Input type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 90000-0000" />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl text-neutral-50 sm:text-5xl">Me mostra teu trabalho</h1>
                <p className="mt-3 text-neutral-400">Eu leio teus links e pesquiso teu nome na web, pra chegar no coach já sabendo quem você é. Tudo opcional.</p>
              </div>
              <div className="grid gap-3">
                <Field label="Instagram"><Input value={insta} onChange={(e) => setInsta(e.target.value)} placeholder="@teuperfil" autoCapitalize="none" /></Field>
                <Field label="Spotify, YouTube ou SoundCloud"><Input value={music} onChange={(e) => setMusic(e.target.value)} placeholder="Cola o link" inputMode="url" autoCapitalize="none" /></Field>
                <Field label="Site ou portfólio"><Input value={site} onChange={(e) => setSite(e.target.value)} placeholder="teusite.com.br" inputMode="url" autoCapitalize="none" /></Field>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1.5 text-sm font-medium text-neutral-200">Em que momento tua carreira está?</legend>
                {STAGES.map((st) => (
                  <Choice key={st.id} selected={stage === st.id} onClick={() => setStage(st.id)} title={st.title} hint={st.hint} />
                ))}
              </fieldset>
              <fieldset className="flex flex-wrap items-center gap-2">
                <legend className="mb-1.5 w-full text-sm font-medium text-neutral-200">Já ganhou algum edital?</legend>
                {([[true, "Sim"], [false, "Ainda não"]] as const).map(([val, label]) => (
                  <button key={label} type="button" aria-pressed={wonEdital === val} onClick={() => setWonEdital(val)}
                    className={`rounded-full border px-4 py-2 text-sm ${wonEdital === val ? "border-emerald-400 bg-emerald-400 font-semibold text-neutral-950" : "border-neutral-700 text-neutral-200 hover:border-neutral-500"}`}>
                    {label}
                  </button>
                ))}
              </fieldset>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl text-neutral-50 sm:text-5xl">Quem toca contigo?</h1>
                <p className="mt-3 text-neutral-400">Edital pede declaração e assinatura de cada integrante. Com o nome e o WhatsApp, eu peço os dados e as assinaturas por você.</p>
              </div>
              <Choice selected={solo} onClick={() => setSolo(!solo)} title="Sou solo" hint="Pula este passo" />
              {!solo && (
                <div className="flex flex-col gap-2">
                  {team.map((m, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-neutral-800 p-3 sm:grid-cols-[1.4fr_1fr_1fr]">
                      <Input aria-label={`Nome do integrante ${i + 1}`} className="col-span-2 sm:col-span-1" value={m.name} placeholder="Nome" onChange={(e) => setTeam((t) => t.map((x, n) => (n === i ? { ...x, name: e.target.value } : x)))} />
                      <Input aria-label={`Função do integrante ${i + 1}`} value={m.role} placeholder="Função" onChange={(e) => setTeam((t) => t.map((x, n) => (n === i ? { ...x, role: e.target.value } : x)))} />
                      <Input aria-label={`WhatsApp do integrante ${i + 1}`} inputMode="tel" value={m.phone} placeholder="WhatsApp" onChange={(e) => setTeam((t) => t.map((x, n) => (n === i ? { ...x, phone: e.target.value } : x)))} />
                    </div>
                  ))}
                  <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setTeam((t) => [...t, blankMember()])}>+ integrante</Button>
                </div>
              )}
            </div>
          )}

          {step === 5 && (
            <div className="flex flex-col gap-6">
              <div>
                <h1 className="text-4xl text-neutral-50 sm:text-5xl">O que você quer destravar primeiro?</h1>
                <p className="mt-3 text-neutral-400">Teu painel começa pelo que você marcar aqui.</p>
              </div>
              <div className="grid gap-2">
                {GOALS.map((g) => (
                  <Choice key={g.id} selected={goals.includes(g.id)} onClick={() => toggle(goals, setGoals, g.id)} title={g.title} hint={g.hint} />
                ))}
              </div>
            </div>
          )}
        </div>

        {err && (
          <p role="alert" className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </p>
        )}

        <div className="mt-10 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button type="button" variant="ghost" onClick={() => setStep(step - 1)} disabled={saving}>
              Voltar
            </Button>
          ) : (
            <span />
          )}
          <Button type="submit" size="lg" disabled={!canNext} loading={saving}>
            {step < STEPS.length - 1 ? "Continuar" : "Abrir meu painel"}
          </Button>
        </div>
      </form>
    </main>
  );
}

export default function Comecar() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}
