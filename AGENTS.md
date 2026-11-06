<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Squad (hackathon-squad-skill)

Este repo opera sob a metodologia do squad: `CONTEXTO.md` (perfil do hack),
`DECISOES.md` (ADR light com fontes), `BOARD.md` (quadro). Leis resumidas:
spec antes de código, main sempre demo-ready (`next build` + `tsc` verdes
antes de "pronto"), decisão com fonte, cartão com dono. Time de 2+agente —
execução serial, merge direto na main (sem worktree por cartão, ver D009).
