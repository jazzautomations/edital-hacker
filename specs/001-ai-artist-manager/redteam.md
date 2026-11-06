# Red team — Manager (empresário de IA)

> Rodei o gate completo do playbook (`hackathon-squad-skill/playbooks/redteam.md`) em 05/nov. Quem ataca não é quem teve a ideia — aqui foi o agente contra a proposta do fundador.

## Premissas

| Premissa | Desejável | Viável | Factível | Veredito |
|---|---|---|---|---|
| Artista não acha empresário humano (32% declaram) | ✅ | ✅ | — | PASSA |
| Fomento fragmentado (R$15bi PNAB → municípios) | ✅ | ✅ | — | PASSA |
| Artista paga por isso (WTP) | ✅ desejável | ⚠️ FRACA | — | validar c/ concierge pago (V01) |
| Sabatina de banca é diferencial | ✅ | ✅ | ✅ construída | PASSA |
| Cobertura federada é moat | ✅ | ⚠️ API pública é replicável | ✅ construída | PASSA parcial |

## Contra-argumentos fortes

1. **"O Projeto Contemplado já existe e é bom"** — feed + elegibilidade + ficha IA + avulso Pix + alertas, até internacionais. Wedge real = sabatina + pipeline/prestação — mais estreito que o pitch sugere. Regra derivada: demo nunca abre no feed.
2. **"É wrapper de GPT"** — sabatina/enrich são; o que não é: ingestão federada multi-instância + dedup + tolerância + dados acumulados do CRM.
3. **"Artista quebrado não paga SaaS"** — verdade. Mitigação: free radar prova valor antes; R$9,90 avulso capta desconfiado. Premissa segue não-provada → V01.
4. **"Quem garante que a nota reflete a banca real?"** — ninguém; produto declara simulação e ancora na rubrica real. Vira feature (honestidade), não bug.

## Dados sem fonte → verificados

- R$15bi PNAB: Lei 14.399/22 + MPV 1.274/24 → Lei 12.132/25 ✅
- 132 opps/6 fontes: medido ao vivo na API Mapas 05/nov ✅
- ~59 do concorrente: site do PC, verificado ✅
- 32% "encontrar empresário": Pesquisa Empresariamento (A. Carvalho) ✅
- R$94bi ao vivo / R$116bi música: ANAFIMA PIB da Música ✅

## Cenários de quebra em demo

- Convex dev não sair → T039 fallback Vercel Cron
- Mapas fora do ar no dia → banco já populado + backup do vídeo
- Firecrawl/agent instável → enrich assíncrono, demo usa edital já enriquecido
- Webhook sandbox falha ao vivo → mostrar webhookLog + clipe gravado

## VEREDITO: PASSA

com a ressalva registrada: wedge mais estreito que a narrativa sugere; WTP não provado → validação concierge (D010) antes de escalar features pagas. Estratégia correta: demo abre na sabatina+pipeline, reconhece o concorrente no pitch (desarma o ataque).

## O que mudou na proposta

- Demo nunca abre no feed (paridade) — abre na sabatina
- Mentor-voz promovida de stretch a core (D007)
- V01 concierge valida WTP com dinheiro real
- "Trabalhadores da arte" entra no framing (TAM + inclui professor/produtor)
