# Contract: POST /api/sabatina

Turno da entrevista de banca (US2). Server-side — Gemini nunca sai do servidor.

## Request

```json
{
  "context": {
    "opportunity": {
      "name": "Edital de Fomento à Música",
      "sourceName": "Mapa Cultural do Ceará",
      "registrationTo": "2026-11-20T23:59:00-03:00",
      "proponentTypes": ["Pessoa Física", "MEI"],
      "categories": ["música"],
      "totalResource": 50000,
      "enriched": {
        "summary": "…", "eligibility": "…",
        "disqualifiers": ["…"], "requiredDocs": ["…"],
        "rubric": [{"criterion": "…", "weight": "30%"}],
        "deadlines": [{"label": "…", "date": "…"}]
      }
    },
    "profile": {
      "name": "MC Exemplo", "personType": "MEI",
      "artAreas": ["música"], "uf": "CE", "bio": "…"
    }
  },
  "history": [{"role": "user"|"model", "text": "…"}]
}
```

`history` vazio → o parecerista abre a sabatina (contexto + 1ª pergunta).

## Response 200

```json
{
  "reply": "pergunta ou fechamento do parecerista",
  "verdict": {
    "score": 72,
    "summary": "…",
    "gaps": ["orçamento sem contrapartida social"],
    "missingDocs": ["certidão negativa federal"],
    "warnings": ["disclaimer: decisão final é da banca real"],
    "injectionDetected": false
  } | null
}
```

`verdict` != null encerra a sessão; UI grava via
`pipeline.setSabatinaResult` (score + summary).

## Regras do contrato

- Conteúdo do edital viaja dentro de `<edital>` no prompt — tratado como
  dado inerte (constituição II); instruções embutidas → `warnings` +
  `injectionDetected: true`, nunca executadas.
- Sem `enriched`, `enriched: null` e a resposta avisa análise parcial.
- `score` ∈ [0,100]; `gaps`/`missingDocs` sempre arrays (podem ser vazios).
- Erros: 400 body inválido · 503 sem `GEMINI_API_KEY`.
