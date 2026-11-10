# Pesquisa: fontes públicas de dinheiro (PNCP · ECAD · prestação · banca)

> Consolidado dos 4 dossiês de pesquisa (2026-02). Todos os endpoints abaixo foram
> testados ao vivo. Tier de evidência por item.

## 1. PNCP — API pública de contratações (medido ao vivo)

Base: `https://pncp.gov.br/api/consulta/v1` — **sem auth**.

| Endpoint | O que retorna | Volume observado |
|---|---|---|
| `GET /contratacoes/publicacao?dataInicial&dataFinal&codigoModalidadeContratacao&pagina&tamanhoPagina` | contratos publicados por modalidade | mod. 9 (inexigibilidade): ~5.283 em 10 dias |
| `GET /contratacoes/atualizacao?...` | atualizações | ídem |
| `GET /atas` | atas de registro de preço | — |

Campos reais por contrato: `description` (nome do artista), `valor_global`,
`municipio`, `uf`, `orgao_entidade`, `fornecedor_nome`, `data_publicacao_pncp`,
`link_sistema_origem`, `numero_controle_pncp`.

- `tamanhoPagina` mínimo = **10** (menor que isso retorna erro).
- ~36k contratos indexados numa janela ampla; R$5,2bi/ano em contratação artística
  estimada; **mediana ~R$15k** → o mercado real é de artista médio, não superstar.
- Credenciamentos abertos: ~394 no dia do teste ("CREDENCIAMENTO DE DJs" em
  Lamim-MG, literal).

**Feature implementada**: `lib/pncp.ts` (wrapper), `convex/pncp.ts` (cron diário
9:30 UTC → `opportunities` + `pncpContracts`), tool `consultar_cache` no coach
(mediana + comparáveis → justificativa de preço Lei 14.133 art. 23 §4º).

**Lei 14.133 art. 23 §4º**: inexigibilidade exige 3 NFs do próprio artista <12m →
feature futura "pasta de cachê comprovável".

## 2. ECAD — setlist/roteiro é dinheiro literal

- O promotor já paga ~10% da bilheteria ao ECAD **independente de tudo**.
- **Sem roteiro entregue**, a verba vai pro rateio geral → paga os autores das
  músicas mais tocadas do país, não quem tocou.
- Roteiro oficial: cabeçalho do evento + obra/autor/intérprete/execução, **máx 31
  faixas por formulário**, prazo ~48h úteis pós-show (licenças < R$500).
- Canal Abramus/associações resgatou ~68% de créditos órfãos retroativos.

**Feature implementada**: `lib/ecad.ts` (xlsx estilo oficial via exceljs),
`/api/roteiro`, botão "📄 ecad" por gig em `/agenda` (modal setlist + promotor/CNPJ),
lembrete de 48h no Briefing do `/coach`.

## 3. Prestação de contas — o risco é CADIN

- Reprovação → inscrição no **CADIN** + dívida ativa + ~3 anos sem poder concorrer.
- Gap de mercado: ledger contínuo de NFs/despesas vinculado ao projeto (ninguém
  cobre ponta a ponta).
- Schema: tabela `expenses` criada (projectId, valor, doc, data, categoria).
  Mutação/UI do ledger = próximo cartão.

## 4. Banca real — a sabatina agora fala a língua dela

- Funil real = **2 estágios**: inabilitação documental (mata 76–90% ANTES do
  mérito) → mérito ponderado.
- Matriz federal PNAB (Anexo IV) publicada — pesos reais: Impacto 3, Mérito 3,
  Planejamento 2, Qualificação 2.
- Concorrente direto descoberto: **edital.ai** ("banca simulada") — mas é
  document-first, não socrático. Nosso diferencial: pergunta como parecerista +
  memória de carreira + execução.

**Feature implementada**: `SABATINA_SYSTEM` reescrito — gate documental binário
(score ≤39 se falhar), `criterionScores` por critério, flags de risco de
desclassificação, defesa de prompt-injection mantida. UI mostra gate + notas por
critério.

## O que NÃO fazer

- Não inventar valor de benchmark: `consultar_cache` responde "nenhum contrato
  encontrado" honesto quando a query vem vazia.
- Roteiro gerado NÃO é declaração jurídica — artista confere antes de submeter.
- `documentalGate` ausente no JSON do LLM hoje default "pass" — revisitar:
  ausência deveria ser "desconhecido", não "passou".
