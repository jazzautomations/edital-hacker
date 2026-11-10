// Regras canônicas de documentos fiscais/habilitatórios BR — o que mata
// inscrição de edital por formalidade. Verificado: CRF-FGTS 30d (erro
// sistêmico: emitir junto com as federais → vence antes da habilitação),
// CND RFB+DAU e CNDT 180d, comprovante 90d, 3 NFs de cachê <12m (Lei
// 14.133/2021 art.23§4º — inexigibilidade). Fontes: Guria, editais AL/PR/MG,
// Comunicado SMC-SP, TCU.

export interface DocRule {
  match: RegExp;
  validityDays?: number;
  hint: string;
  emitUrl?: string;
  priority?: "critico";
}

export const DOC_RULES: DocRule[] = [
  {
    match: /fgts|crf/i,
    validityDays: 30,
    hint: "Vale só 30 dias — emite NA SEMANA da entrega do edital, nunca junto com as federais.",
    emitUrl: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf",
    priority: "critico",
  },
  {
    match: /cndt|trabalh/i,
    validityDays: 180,
    hint: "Vale 180 dias — pode emitir cedo.",
    emitUrl: "https://cndt-certidao.tst.jus.br/inicio.faces",
  },
  {
    match: /cnd|rfb|dau|receita|federal/i,
    validityDays: 180,
    hint: "Federal (RFB+DAU) vale 180 dias — emite cedo sem medo.",
    emitUrl: "https://solucoes.receita.fazenda.gov.br/servicos/cndrfbsppa/cndmobile.htm",
  },
  {
    match: /estadual|icms|cnde/i,
    validityDays: 180,
    hint: "CND estadual — emite no portal da SEFAZ do teu estado (prazo varia por UF).",
  },
  {
    match: /municipal|iss|cndm|tributos municipais/i,
    validityDays: 180,
    hint: "CND municipal — emite no portal de tributos da tua prefeitura.",
  },
  {
    match: /comprovante|resid[eê]ncia|domic[ií]lio/i,
    validityDays: 90,
    hint: "Editais aceitam 60–90 dias — confere o prazo do edital específico.",
  },
  {
    match: /mei|ccmei/i,
    hint: "Não vence, mas confere o CNAE: edital PJ pede atividade cultural (9001-9/02 músico, 8592-9/03 instrutor, 9001-9/06 sonorização). Agenciamento/estúdio/produtora NÃO cabem no MEI.",
    emitUrl: "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor",
    priority: "critico",
  },
  {
    match: /cadin/i,
    hint: "Consulta CADIN antes de fechar contrato com ente público — dívida ativa bloqueia pagamento mesmo aprovado.",
  },
  {
    match: /credor|caufesp|capac|sicab|salic|sicaf/i,
    hint: "Cadastro de credor não vence, mas sem ele o ente não paga — mesmo com projeto aprovado. Confere se tá ativo.",
  },
  {
    match: /nf|nota fiscal|cach[eê]/i,
    hint: "Lei 14.133 art.23§4º: inexigibilidade pede 3 NFs de cachê dos últimos 12 meses — mantém sempre 3 válidas guardadas.",
    priority: "critico",
  },
];

export function ruleFor(docNameOrKind: string): DocRule | undefined {
  return DOC_RULES.find((r) => r.match.test(docNameOrKind));
}
