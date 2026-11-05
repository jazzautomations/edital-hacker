# Contract: POST /api/live-token

Emite token efêmero para o browser conectar no Gemini Live (stretch goal da
US2 — sabatina por voz). A chave permanente nunca sai do servidor.

## Request

```json
{ "sessionId": "opcional — para correlacionar logs" }
```

## Response 200

```json
{
  "token": "auth_tokens/…",
  "expireTime": "2026-11-05T22:00:00Z",
  "newSessionExpireTime": "2026-11-05T21:31:00Z",
  "model": "gemini-2.5-flash-native-audio-preview-12-2025",
  "config": { "responseModalities": ["AUDIO"] }
}
```

## Regras

- Token de uso único com constraints embutidos (modelo, modalities) —
  implementado via `ai.authTokens.create({config:{uses:1, expireTime,
  newSessionExpireTime, liveConnectConstraints}})`.
- TTL de sessão ~30 min / nova conexão ~1 min (padrão doc).
- Erros: 503 sem `GEMINI_API_KEY`.
