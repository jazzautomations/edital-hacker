// Gerador de Roteiro Musical ECAD (.xlsx).
// Sem o roteiro, a verba do show (que o promotor JÁ PAGOU — ~10% da
// bilheteria/custo musical) cai no rateio "Extra de Show" e paga OUTROS
// autores. Prazo: até 48h úteis após o evento para shows < R$500 de
// arrecadação; formato oficial: xlsx, ≤31 músicas por formulário.
// Fonte: ecad.org.br/envio-da-programacao-musical + pesquisa direitos nov/26.

import ExcelJS from "exceljs";

export interface RoteiroEvento {
  artista: string; // nome artístico do titular/apresentador
  evento: string; // título do show/gig
  local: string; // venue + cidade
  data: string; // ISO ou DD/MM/AAAA
  promotor?: string; // nome/razão do promotor (quem licencia junto ao ECAD)
  cnpjPromotor?: string;
}

export interface RoteiroFaixa {
  obra: string; // título da música
  autores: string; // compositores (nome civil, separados por ;)
  interprete?: string; // default = artista do evento
  tipo?: "AO VIVO" | "MECÂNICA"; // default AO VIVO
}

export async function buildRoteiroXlsx(
  evento: RoteiroEvento,
  faixas: RoteiroFaixa[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Roteiro Musical");

  ws.columns = [
    { width: 42 }, // obra
    { width: 42 }, // autores
    { width: 32 }, // intérprete
    { width: 18 }, // tipo execução
  ];

  // Cabeçalho do evento — quem lê no ECAD identifica a execução
  ws.addRow(["ROTEIRO MUSICAL — ECAD"]).font = { bold: true, size: 14 };
  ws.addRow([]);
  ws.addRow(["Artista/apresentador:", evento.artista]).font = { bold: true };
  ws.addRow(["Evento:", evento.evento]);
  ws.addRow(["Local:", evento.local]);
  ws.addRow(["Data:", evento.data]);
  if (evento.promotor) ws.addRow(["Promotor:", evento.promotor]);
  if (evento.cnpjPromotor) ws.addRow(["CNPJ/CPF do promotor:", evento.cnpjPromotor]);
  ws.addRow([]);

  const head = ws.addRow(["OBRA", "AUTOR(ES)", "INTÉRPRETE", "EXECUÇÃO"]);
  head.font = { bold: true };
  head.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
    c.border = { bottom: { style: "thin" } };
  });

  for (const f of faixas.slice(0, 31)) {
    ws.addRow([f.obra, f.autores, f.interprete ?? evento.artista, f.tipo ?? "AO VIVO"]);
  }

  ws.addRow([]);
  ws.addRow([
    `Gerado pelo Manager em ${new Date().toLocaleDateString("pt-BR")} — confira com a sua associação (UBC/Abramus/SICAM/…) antes de submeter.`,
  ]).font = { italic: true, size: 9 };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Copy do lembrete — o timing real do roteiro.
export const ECAD_RULES = {
  prazoBarato: "shows com licença < R$500: roteiro em até 48h ÚTEIS após o evento — sem correção depois",
  prazoGeral: "roteiro antes ou imediatamente após o show; distribuição até 60 dias",
  semRoteiro: "sem roteiro, a verba cai no rateio 'Extra de Show' e paga outros autores",
  retroativo: "perdeu o prazo? A Abramus aceita 'agenda de shows' retroativa — resgatou 68% dos créditos órfãos",
};
