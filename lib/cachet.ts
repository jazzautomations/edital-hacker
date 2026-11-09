// Calculadora de piso de cachê — "não chute seu cachê" (medir em R$, D014).
// Determinística: soma custos + margem → piso e faixa sugerida.

export interface CachetInput {
  musicians: number;      // pessoas em cima do palco (incl. você)
  payPerMusician: number; // quanto cada um precisa receber (R$)
  transportKm: number;    // km ida+volta
  kmCost?: number;        // R$/km (default 1.20)
  techCost: number;       // som/luz/técnico se não incluso
  lodging: number;        // hospedagem/alimentação
  extraCosts: number;     // figurino, freela, ensaio
  marginPct?: number;     // margem de negociação/lucro (default 0.25)
}

export interface CachetResult {
  costs: number;
  floor: number;      // piso: abaixo disso você paga pra tocar
  suggested: number;  // pedida recomendada (piso + margem)
  ceiling: number;    // teto da faixa de negociação
  perMusician: number;
}

export function calcCachet(i: CachetInput): CachetResult {
  const km = i.kmCost ?? 1.2;
  const margin = i.marginPct ?? 0.25;
  const costs =
    i.musicians * i.payPerMusician +
    i.transportKm * km +
    i.techCost +
    i.lodging +
    i.extraCosts;
  const floor = Math.ceil(costs);
  const suggested = Math.ceil(costs * (1 + margin));
  const ceiling = Math.ceil(costs * (1 + margin * 2));
  return { costs, floor, suggested, ceiling, perMusician: Math.ceil(suggested / Math.max(i.musicians, 1)) };
}
