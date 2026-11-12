// Tipos do domínio — espelham convex/schema.ts enquanto o codegen real não roda.
export interface EnrichedData {
  summary?: string;
  eligibility?: string;
  disqualifiers: string[];
  requiredDocs: string[];
  rubric: { criterion: string; weight?: string }[];
  deadlines: { label: string; date: string }[];
}

export interface Opportunity {
  _id: string;
  source: string;
  sourceName: string;
  externalId: string;
  name: string;
  shortDescription?: string;
  kind?: string;
  registrationFrom?: string;
  registrationTo?: string;
  proponentTypes: string[];
  categories: string[];
  totalResource?: number;
  vacancies?: number;
  registrationLimitPerOwner?: number;
  ownerName?: string;
  sourceUrl: string;
  status: string;
  rawMarkdown?: string;
  enriched?: EnrichedData;
  lastSeenAt: number;
}

export interface Profile {
  _id: string;
  name: string;
  email: string;
  personType: string;
  artAreas: string[];
  uf?: string;
  bio?: string;
  portfolioUrl?: string;
  phone?: string;
  city?: string;
  goals?: string[];
  onboardedAt?: number;
  plan: string;
  createdAt: number;
}

export interface PipelineItem {
  _id: string;
  profileId: string;
  opportunityId: string;
  stage: string;
  notes?: string;
  sabatinaScore?: number;
  sabatinaSummary?: string;
  updatedAt: number;
  opportunity?: Opportunity | null;
}

// personType do perfil → keywords que casam nos registrationProponentTypes
// do Mapas. "Coletivo sem CNPJ" conta como PF na maioria dos editais.
const PERSON_TYPE_KEYWORDS: Record<string, string[]> = {
  "Pessoa Física": ["física", "fisica", "pf", "pessoa física", "pessoa fisica"],
  MEI: ["mei", "física", "fisica", "microempreendedor"],
  "Pessoa Jurídica": ["jurídica", "juridica", "pj", "pessoa jurídica", "pessoa juridica"],
  "Coletivo sem CNPJ": ["coletivo", "física", "fisica", "informal"],
};

export function personTypeMatches(
  personType: string,
  proponentTypes: string[]
): boolean {
  if (proponentTypes.length === 0) return true;
  const keys = PERSON_TYPE_KEYWORDS[personType] ?? [personType.toLowerCase()];
  return proponentTypes.some((p) =>
    keys.some((k) => p.toLowerCase().includes(k))
  );
}
