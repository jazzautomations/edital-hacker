// Planos, limites e pacotes avulsos: fonte única (app, servidor e Convex).
// Mudar preço ou limite = mudar aqui.

export type PlanId = "free" | "manager" | "manager_pro";
export type UsageKind = "coach_msg" | "voice_min" | "prospect" | "agency_map" | "sign_doc";

export const PERIOD: Record<UsageKind, "dia" | "mes"> = {
  coach_msg: "dia",
  voice_min: "mes",
  prospect: "mes",
  agency_map: "mes",
  sign_doc: "mes",
};

export const LIMITS: Record<PlanId, Record<UsageKind, number> & { zap: boolean }> = {
  free: { coach_msg: 15, voice_min: 5, prospect: 1, agency_map: 0, sign_doc: 1, zap: false },
  manager: { coach_msg: 200, voice_min: 30, prospect: 6, agency_map: 3, sign_doc: 15, zap: true },
  manager_pro: { coach_msg: 500, voice_min: 120, prospect: 20, agency_map: 10, sign_doc: 1000, zap: true },
};

export const USAGE_LABEL: Record<UsageKind, { one: string; many: string; unit?: string }> = {
  coach_msg: { one: "mensagem ao coach", many: "mensagens ao coach" },
  voice_min: { one: "minuto de voz", many: "minutos de voz" },
  prospect: { one: "prospecção", many: "prospecções" },
  agency_map: { one: "mapeamento de agência", many: "mapeamentos de agência" },
  sign_doc: { one: "documento pra assinar", many: "documentos pra assinar" },
};

/** Pacotes avulsos pagos no Pix: somam crédito que não expira. */
export const PACKS = {
  voz30: { kind: "voice_min" as UsageKind, amount: 30, cents: 1990, title: "+30 minutos de voz" },
  prosp5: { kind: "prospect" as UsageKind, amount: 5, cents: 1990, title: "+5 prospecções" },
};
export type PackId = keyof typeof PACKS;

export const planOf = (p?: string | null): PlanId => (p === "manager" || p === "manager_pro" ? p : "free");

/** Chave do período: 2026-11-13 (dia) ou 2026-11 (mês), no fuso de SP. */
export function periodKey(kind: UsageKind, now = Date.now()): string {
  const d = new Date(now - 3 * 3600_000).toISOString();
  return PERIOD[kind] === "dia" ? d.slice(0, 10) : d.slice(0, 7);
}
