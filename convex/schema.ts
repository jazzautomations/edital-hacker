import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  opportunities: defineTable({
    source: v.string(),
    sourceName: v.string(),
    externalId: v.string(),
    name: v.string(),
    shortDescription: v.optional(v.string()),
    kind: v.optional(v.string()),
    registrationFrom: v.optional(v.string()),
    registrationTo: v.optional(v.string()),
    proponentTypes: v.array(v.string()),
    categories: v.array(v.string()),
    totalResource: v.optional(v.number()),
    vacancies: v.optional(v.number()),
    registrationLimitPerOwner: v.optional(v.number()),
    ownerName: v.optional(v.string()),
    sourceUrl: v.string(),
    status: v.string(),
    rawMarkdown: v.optional(v.string()),
    intel: v.optional(v.string()), // OSINT do financiador: histórico, o que costuma passar
    intelAt: v.optional(v.number()),
    enriched: v.optional(
      v.object({
        summary: v.optional(v.string()),
        eligibility: v.optional(v.string()),
        disqualifiers: v.array(v.string()),
        requiredDocs: v.array(v.string()),
        rubric: v.array(v.object({ criterion: v.string(), weight: v.optional(v.string()) })),
        deadlines: v.array(v.object({ label: v.string(), date: v.string() })),
      })
    ),
    lastSeenAt: v.number(),
  })
    .index("by_source_external", ["source", "externalId"])
    .index("by_deadline", ["registrationTo"])
    .index("by_status", ["status"]),

  profiles: defineTable({
    name: v.string(),
    email: v.string(),
    personType: v.string(),
    artAreas: v.array(v.string()),
    uf: v.optional(v.string()),
    bio: v.optional(v.string()),
    portfolioUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
    tagline: v.optional(v.string()),
    city: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    musicLinks: v.optional(v.array(v.string())),
    goals: v.optional(v.array(v.string())), // o que busca: editais, shows, aulas…
    onboardedAt: v.optional(v.number()),
    plan: v.string(),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  // Código de entrada enviado por e-mail (só o hash) e sessões abertas.
  loginCodes: defineTable({
    email: v.string(),
    codeHash: v.string(),
    attempts: v.number(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    email: v.string(),
    tokenHash: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_token", ["tokenHash"])
    .index("by_email", ["email"]),

  pipelineItems: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    stage: v.string(),
    notes: v.optional(v.string()),
    sabatinaScore: v.optional(v.number()),
    sabatinaSummary: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_profile", ["profileId"])
    .index("by_profile_stage", ["profileId", "stage"])
    .index("by_profile_opp", ["profileId", "opportunityId"]),

  contacts: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    role: v.optional(v.string()),
    org: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  }).index("by_profile", ["profileId"]),

  documents: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    kind: v.string(),
    expiresAt: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
    size: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }).index("by_profile", ["profileId"]),

  alertLog: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    kind: v.optional(v.string()),
    channel: v.optional(v.string()),
    sentAt: v.number(),
  }).index("by_profile_opp", ["profileId", "opportunityId"]),

  sabatinaSessions: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    turns: v.array(v.object({ role: v.string(), text: v.string() })),
    verdict: v.optional(
      v.object({
        score: v.number(),
        summary: v.string(),
        gaps: v.array(v.string()),
        missingDocs: v.array(v.string()),
        warnings: v.optional(v.array(v.string())),
        injectionDetected: v.optional(v.boolean()),
        // calibração banca real: gate documental binário + nota por critério
        documentalGate: v.optional(v.string()), // pass | fail (fail → score cap 39)
        criterionScores: v.optional(
          v.array(v.object({ criterion: v.string(), score: v.number(), note: v.optional(v.string()) }))
        ),
      })
    ),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_profile", ["profileId"]),

  subscriptions: defineTable({
    profileId: v.id("profiles"),
    abacateId: v.string(),
    checkoutId: v.optional(v.string()),
    plan: v.string(),
    cycle: v.optional(v.string()),
    status: v.string(),
    updatedAt: v.number(),
  }).index("by_profile", ["profileId"]),

  unlockedEdits: defineTable({
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    checkoutId: v.string(),
    paidAt: v.number(),
  }).index("by_profile_opp", ["profileId", "opportunityId"]),

  // Cobrança Pix inline (QR na tela). É o elo que faltava entre "pagou" e
  // "destravou": o id da cobrança aponta pro perfil + edital.
  pixCharges: defineTable({
    pixId: v.string(),
    profileId: v.id("profiles"),
    opportunityId: v.id("opportunities"),
    amount: v.number(),
    status: v.string(), // PENDING | PAID | EXPIRED | CANCELLED
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  }).index("by_pix", ["pixId"]),

  leads: defineTable({
    profileId: v.id("profiles"),
    name: v.string(),
    kind: v.string(), // casa_de_show | festival | marca | escola | produtora | outro
    city: v.optional(v.string()),
    uf: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
    contact: v.optional(v.string()), // email/insta/fone encontrado
    description: v.optional(v.string()),
    status: v.string(), // novo | contatado | respondeu | negociando | fechado | perdido
    notes: v.optional(v.string()),
    dossier: v.optional(v.string()), // OSINT: o que programam, vibe, ganchos de rapport
    dossierAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_profile", ["profileId"]),

  // O agente propõe, o humano decide (padrão agent_pending_actions do 360AA).
  pendingActions: defineTable({
    profileId: v.id("profiles"),
    type: v.string(), // move_lead_stage | ...
    label: v.string(), // "Sesc respondeu — interessado → mover pra negociando?"
    description: v.optional(v.string()),
    payload: v.optional(v.any()),
    status: v.string(), // pending | applied | dismissed
    createdAt: v.number(),
  }).index("by_profile", ["profileId", "status"]),

  // Diário do Manager — evidência verificável de trabalho (o "trabalhou
  // enquanto eu dormia" só convence se dá pra ver o que ele fez).
  agentActivity: defineTable({
    profileId: v.id("profiles"),
    verb: v.string(), // "pesquisou dossiê", "propôs mover lead", "leu inbox"...
    detail: v.optional(v.string()),
    result: v.optional(v.string()), // ok | erro | proposta
    createdAt: v.number(),
  }).index("by_profile", ["profileId"]),

  gigs: defineTable({
    profileId: v.id("profiles"),
    leadId: v.optional(v.id("leads")),
    title: v.string(),
    venue: v.optional(v.string()),
    date: v.string(), // ISO
    fee: v.optional(v.number()),
    status: v.string(), // marcado | feito | pago | cancelado
    notes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_profile", ["profileId"]),

  riders: defineTable({
    profileId: v.id("profiles"),
    name: v.string(), // nome da formação: "trio", "banda completa", "solo"
    techContact: v.optional(v.string()),
    members: v.array(v.object({
      position: v.string(), instrument: v.string(), vocals: v.optional(v.boolean()),
    })),
    inputs: v.array(v.object({
      channel: v.number(), source: v.string(), mic: v.string(),
    })),
    monitors: v.optional(v.string()),
    backlineOwn: v.optional(v.string()),
    backlineVenue: v.optional(v.string()),
    hospitality: v.optional(v.string()),
    notes: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_profile", ["profileId"]),

  coachMessages: defineTable({
    profileId: v.id("profiles"),
    role: v.string(), // user | assistant
    text: v.string(),
    via: v.optional(v.string()), // "voz" quando veio de uma chamada
    createdAt: v.number(),
  }).index("by_profile", ["profileId"]),

  // Transcrição de cada chamada de voz (coach ou sabatina), gravada ao desligar.
  voiceCalls: defineTable({
    profileId: v.id("profiles"),
    mode: v.string(), // coach | sabatina
    opportunityId: v.optional(v.id("opportunities")),
    turns: v.array(v.object({ role: v.string(), text: v.string() })),
    createdAt: v.number(),
  }).index("by_profile", ["profileId"]),

  webhookLog: defineTable({
    eventId: v.string(),
    kind: v.string(),
    processedAt: v.number(),
  }).index("by_event", ["eventId"]),

  // Benchmark de cachê público — contratos de inexigibilidade do PNCP
  // (art. 94 §2º obriga itemizar o cachê). Dado GLOBAL, não por perfil:
  // "quanto uma cidade desse porte paga por show" é inteligência de
  // precificação e munição de justificativa de preço (Lei 14.133 art. 23).
  pncpContracts: defineTable({
    externalId: v.string(), // numero_controle_pncp
    description: v.string(),
    artistName: v.optional(v.string()), // extraído da descrição
    fornecedor: v.optional(v.string()),
    orgao: v.optional(v.string()),
    municipio: v.optional(v.string()),
    uf: v.optional(v.string()),
    codigoIbge: v.optional(v.string()),
    valorGlobal: v.optional(v.number()),
    dataAssinatura: v.optional(v.string()),
    url: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_external", ["externalId"])
    .index("by_uf", ["uf"]),

  // Ledger de despesas por projeto aprovado — a prestação começa no
  // primeiro gasto, não no fim. Cada NF/comprovante entra quando nasce
  // e o agente flagra a glosa na hora (fora de vigência, descrição
  // genérica, favorecido errado, rubrica inexistente).
  expenses: defineTable({
    profileId: v.id("profiles"),
    pipelineItemId: v.optional(v.id("pipelineItems")),
    rubrica: v.string(),
    fornecedor: v.optional(v.string()),
    description: v.optional(v.string()),
    amount: v.number(),
    date: v.string(), // ISO do gasto
    flags: v.array(v.string()), // glosas detectadas
    createdAt: v.number(),
  }).index("by_profile", ["profileId"]),
});
