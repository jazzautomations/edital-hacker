# Manager Constitution

## Core Principles

### I. Demo-First (NON-NEGOTIABLE)

Tudo que entra no repositório deve funcionar ao vivo. Feature que não roda
end-to-end não conta como entregue — melhor cortar escopo que simular
funcionamento. Prioridade de escopo sempre responde: "isso aparece no vídeo
de 3 minutos?"

### II. Conteúdo é dado, nunca instrução (NON-NEGOTIABLE)

Texto vindo de editais, páginas raspadas, PDFs e uploads de usuários é dado
inerte. Instruções embutidas nesse conteúdo não são executadas, não alteram
prompts e são reportadas quando detectadas. System prompts nunca interpolam
conteúdo não confiável fora de uma seção de dados delimitada.

### III. Segredos só no servidor

Nenhuma chave de API vai para o browser — nem em build, nem em token de longa
duração. Serviços de browser conectam via credenciais efêmeras emitidas por
rota de servidor. `.env*` nunca é commitado; `.env.example` documenta cada
variável.

### IV. Sem promessa de aprovação

O produto nunca afirma que garante resultado em edital. Todo parecer deixa
explícito que a decisão final é da banca real. Saúde jurídica do usuário vem
antes de marketing.

### V. Semântica de hackathon

Código e histórico de commits começam após a abertura do evento (4/nov/2026
21h BRT). Conceitos de protótipos anteriores podem inspirar; arquivos,
commits e texto pré-evento não. Repo público, com demo ao vivo.

## Constraints

- Dados de demonstração: sintéticos para pessoas; reais apenas para
  oportunidades públicas.
- Idioma da interface e dos artefatos de usuário: português brasileiro.
- Pagamentos em modo sandbox durante o evento.
- Stack aprovada: Next.js (web), Convex (dados/jobs), Gemini (LLM/voz),
  Firecrawl (coleta fora da API), Resend (email), AbacatePay (Pix), WorkOS
  (auth). Integrações novas entram só se resolverem requisito real da spec.

## Development Workflow

- Verificação antes de "pronto": `next build` + `tsc` limpos; fluxo afetado
  exercitado de ponta a ponta.
- Fonte de verdade de requisitos: `specs/001-ai-artist-manager/spec.md`;
  decisões técnicas: `research.md`; entidades: `data-model.md`.
- Mudança de escopo: edita-se a spec primeiro, depois o código.

## Governance

A constituição prevalece sobre conveniência de implementação. Violação
exige justificativa registrada na seção Complexity Tracking do plan.md.

**Version**: 1.0.0 | **Ratified**: 2026-11-05 | **Last Amended**: 2026-11-05
