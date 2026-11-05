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
