# Feature Specification: Manager — Empresário de IA para Artistas Independentes

**Feature Branch**: `001-ai-artist-manager`

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Um manager/empresário de IA para artistas independentes brasileiros: encontra editais e oportunidades que aceitam o perfil do artista, sabatina a proposta como uma banca real, organiza documentos, prazos e pipeline de carreira (CRM), alerta por email, e cobra assinatura/microtransação via Pix — por menos que a comissão de um booker humano (15–20%)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Radar de oportunidades que aceitam o perfil (Priority: P1)

Uma artista independente cria seu perfil (nome artístico, PF/MEI/PJ/coletivo, áreas de atuação, UF, bio). O sistema mantém um catálogo atualizado de oportunidades culturais abertas — editais públicos, prêmios, residências e chamadas — agregado de dezenas de fontes oficiais brasileiras. A artista abre o feed e vê somente o que está aberto, com prazo restante, valor disponível e quem pode se inscrever.

**Why this priority**: É a dor número um ("não sei onde tem dinheiro pra mim") e o único valor que o produto entrega antes de pedir qualquer pagamento. Sem oportunidades reais e atuais, todo o resto é demo vazia.

**Independent Test**: Pode ser testada criando um perfil e abrindo o feed: deve listar oportunidades reais abertas hoje, vindas de múltiplas fontes oficiais, com prazo de inscrição futuro. Entrega valor mesmo sem nenhuma outra story.

**Acceptance Scenarios**:

1. **Given** o catálogo foi atualizado nas últimas 24h, **When** a artista abre o feed, **Then** vê oportunidades ordenadas por prazo, cada uma com fonte, prazo restante e valor quando divulgado.
2. **Given** uma oportunidade com elegibilidade explícita (ex.: só PJ), **When** o perfil da artista é incompatível, **Then** a incompatibilidade fica visível (badge ou filtro) em vez de escondida.
3. **Given** uma fonte oficial fora do ar, **When** a atualização diária roda, **Then** as demais fontes continuam sendo processadas e a falha é registrada — nunca derruba o catálogo inteiro.
4. **Given** o mesmo edital publicado em duas fontes, **When** é ingerido, **Then** aparece uma única vez no feed.

---

### User Story 2 — Sabatina de banca contra a rubrica real (Priority: P2)

Antes de se inscrever, a artista abre uma oportunidade e é entrevistada por um parecerista simulado. A sabatina faz perguntas difíceis e específicas — orçamento, contrapartida, trajetória, público — ancoradas no que o edital realmente exige e pontua. Ao final, a artista recebe um parecer com nota de 0 a 100, os pontos onde perderia ponto, os documentos que faltam e o que a desclassificaria na hora.

**Why this priority**: É o diferencial que nenhum concorrente demonstra — transforma "IA que escreve" em "IA que te prepara". É o momento da demo que o júri lembra.

**Independent Test**: Pode ser testada abrindo qualquer oportunidade do feed e respondendo 3–5 perguntas da sabatina: o parecer final deve citar critérios do edital real e identificar pelo menos um gap acionável.

**Acceptance Scenarios**:

1. **Given** uma oportunidade com critérios de pontuação conhecidos, **When** a artista responde às perguntas, **Then** o parecer final referencia esses critérios e justifica a nota com base neles.
2. **Given** uma resposta vaga (ex.: "quero fazer um show"), **When** a sabatina processa, **Then** o parecerista faz pergunta de aprofundamento em vez de aceitar.
3. **Given** uma artista inelegível (ex.: PF em edital que exige PJ), **When** a sabatina começa, **Then** o sistema alerta a inelegibilidade antes de gastar o tempo dela.
4. **Given** a sabatina concluída, **When** o parecer é gerado, **Then** inclui: nota 0–100, resumo, lista de gaps e lista de documentos faltantes — e fica salvo junto à oportunidade.

---

### User Story 3 — Pipeline de carreira e documentos (Priority: P3)

A artista move cada oportunidade por um pipeline visual: descoberta → interessado → inscrito → ganho → em execução → prestação de contas. Mantém seus documentos recorrentes (certidões, portfólio, procuração) com datas de vencimento, e contatos (secretarias, produtores, marcas) ligados às oportunidades.

**Why this priority**: É o que transforma a ferramenta em relação contínua (a assinatura se justifica aqui) — o histórico acumulado vira o moat. Sem ele, o produto é uma calculadora descartável.

**Independent Test**: Pode ser testada adicionando uma oportunidade ao pipeline, movendo-a entre estágios e cadastrando um documento com vencimento — o estado persiste entre sessões.

**Acceptance Scenarios**:

1. **Given** uma oportunidade no feed, **When** a artista marca interesse, **Then** ela aparece no pipeline no estágio inicial.
2. **Given** um item no pipeline, **When** a artista muda o estágio, **Then** a mudança persiste e registra a data da atualização.
3. **Given** um documento cadastrado com vencimento próximo, **When** o prazo se aproxima, **Then** o sistema avisa que o documento precisa ser renovado.
4. **Given** o parecer de uma sabatina, **When** o item correspondente está no pipeline, **Then** a nota e o resumo ficam visíveis no card.

---

### User Story 4 — Alertas proativos por email (Priority: P4)

A artista recebe email quando: (a) abre oportunidade nova que combina com suas áreas e tipo de proponente, (b) um item do pipeline está a menos de 3 dias do prazo de inscrição, (c) um documento cadastrado está vencendo. Nunca recebe o mesmo alerta duas vezes.

**Why this priority**: É o canal de retorno — traz a artista de volta sem ela lembrar de abrir o app. É onde a relação contínua acontece.

**Independent Test**: Pode ser testada cadastrando um perfil com área "música", inserindo uma oportunidade nova de música e disparando a rotina de alertas: o perfil recebe um email com a oportunidade e não recebe duplicata na segunda execução.

**Acceptance Scenarios**:

1. **Given** uma oportunidade nova compatível, **When** a rotina de alertas roda, **Then** a artista recebe email com nome, fonte, prazo e link do edital.
2. **Given** o mesmo par perfil+oportunidade já alertado, **When** a rotina roda de novo, **Then** nenhum email é reenviado.
3. **Given** um item no pipeline com inscrição vencendo em ≤3 dias, **When** a rotina roda, **Then** chega um lembrete de prazo.

---

### User Story 5 — Cobrança justa via Pix (Priority: P5)

A artista usa o radar de graça. Para destravar sabatina ilimitada, pipeline e alertas em tempo real, assina o plano mensal ou anual (anual com desconto). Quem não quer assinar destrava a sabatina completa de um único edital por uma microtransação Pix de baixo valor. O status do plano libera as funcionalidades automaticamente após confirmação do pagamento.

**Why this priority**: É a demonstração de viabilidade de negócio e a história de receita no vídeo — mas o produto precisa funcionar de graça primeiro pra ter quem cobrar.

**Independent Test**: Pode ser testada criando um checkout de assinatura em ambiente de teste, concluindo o pagamento simulado e verificando que o plano do perfil muda para ativo.

**Acceptance Scenarios**:

1. **Given** um perfil gratuito, **When** tenta iniciar a segunda sabatina, **Then** vê a oferta de plano ou a opção de destravar só aquele edital.
2. **Given** um pagamento confirmado, **When** o sistema recebe a confirmação, **Then** o plano do perfil é ativado sem intervenção manual.
3. **Given** uma assinatura ativa, **When** a cobrança da renovação falha repetidamente, **Then** o plano volta ao gratuito após esgotadas as retentativas automáticas.

---

### Edge Cases

- Edital publicado com dados incompletos (sem valor, sem rubrica explícita): exibir o que existe e marcar o que falta, nunca inventar.
- Conteúdo malicioso embutido em página/PDF de edital (prompt injection): tratar como dado inerte, ignorar instruções e registrar.
- Dois perfis com o mesmo email: um email identifica um único perfil; reentrar com o mesmo email reabre o mesmo perfil.
- Oportunidade cujo prazo já passou entre a ingestão e a visualização: feed nunca exibe prazo vencido como "aberto".
- Sabatina iniciada para edital sem texto completo disponível: usar os metadados básicos e avisar que a análise é parcial.
- Artista que nunca completa o perfil: o radar funciona sem perfil; o match fino exige áreas informadas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE manter um catálogo de oportunidades culturais coletado de múltiplas fontes oficiais brasileiras, atualizado ao menos uma vez por dia.
- **FR-002**: O sistema DEVE normalizar cada oportunidade num formato único: nome, fonte, prazos de inscrição, tipos de proponente aceitos, categorias/áreas, valor total quando divulgado, e link oficial.
- **FR-003**: O sistema DEVE deduplicar oportunidades que aparecem em mais de uma fonte.
- **FR-004**: O sistema DEVE enriquecer cada oportunidade com uma estrutura legível do edital: resumo, requisitos de elegibilidade, itens que desclassificam, documentos exigidos, critérios de avaliação com pesos e datas-chave.
- **FR-005**: O feed DEVE exibir apenas oportunidades com inscrição aberta ou prazo futuro, ordenadas por prazo.
- **FR-006**: A artista DEVE poder criar e editar um perfil com tipo de proponente, áreas de atuação, UF e biografia.
- **FR-007**: O sistema DEVE indicar compatibilidade ou incompatibilidade evidente entre perfil e elegibilidade quando esta é conhecida.
- **FR-008**: O sistema DEVE conduzir uma entrevista estruturada (sabatina) por texto sobre a proposta da artista, fazendo perguntas de aprofundamento quando respostas forem vagas.
- **FR-009**: Ao final da sabatina, o sistema DEVE gerar parecer com nota 0–100, resumo, gaps onde a proposta perde pontos e documentos faltantes — fundamentado no que o edital exige, sem inventar requisitos.
- **FR-010**: O parecer DEVE ficar persistido e associado ao item do pipeline correspondente.
- **FR-011**: A artista DEVE poder mover itens entre os estágios do pipeline, com histórico de atualização.
- **FR-012**: A artista DEVE poder cadastrar documentos com data de vencimento e contatos ligados à sua operação.
- **FR-013**: O sistema DEVE enviar alertas por email para: novas oportunidades compatíveis, prazos de itens do pipeline a ≤3 dias, e documentos vencendo — nunca duplicando o mesmo alerta.
- **FR-014**: O sistema DEVE suportar três níveis de acesso: gratuito (radar), assinatura mensal/anual (sabatina ilimitada + pipeline + alertas), e destravamento avulso de um edital via microtransação.
- **FR-015**: A ativação do plano DEVE ocorrer automaticamente após confirmação de pagamento; falha de renovação após retentativas DEVE rebaixar o plano.
- **FR-016**: Todo conteúdo lido de editais, páginas e documentos DEVE ser tratado como dado inerte; instruções embutidas nesses conteúdos não podem ser executadas nem alterar o comportamento do sistema.
- **FR-017**: O sistema NÃO DEVE afirmar que garante aprovação; todo parecer deixa explícito que a decisão final é da banca real.
- **FR-018**: Nenhum dado pessoal real de terceiros pode aparecer nas demonstrações; perfis e projetos de exemplo usam dados sintéticos.

### Key Entities

- **Perfil de artista**: identidade (nome artístico, email), tipo de proponente (PF/MEI/PJ/coletivo), áreas de atuação, UF, bio, plano contratado.
- **Oportunidade**: edital/prêmio/chamada normalizada — fonte, nome, prazos, proponentes aceitos, categorias, valor, link oficial, status.
- **Edital estruturado**: enriquecimento da oportunidade — elegibilidade, desclassificadores, documentos exigidos, rubrica/critérios, datas-chave.
- **Item de pipeline**: liga perfil ↔ oportunidade com estágio, notas, nota e resumo da sabatina.
- **Sabatina**: sessão de entrevista — histórico de perguntas/respostas e parecer final.
- **Documento**: arquivo recorrente do artista com tipo e vencimento.
- **Contato**: pessoa/organização ligada à operação (secretaria, produtor, marca).
- **Alerta**: registro de notificação enviada (perfil + oportunidade) para deduplicação.
- **Assinatura**: estado do plano do perfil, ciclo e data de renovação.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O catálogo mantém pelo menos 100 oportunidades abertas simultâneas vindas de 5+ fontes oficiais distintas — mais que o dobro da cobertura do concorrente direto mais próximo (~59).
- **SC-002**: Uma artista vai do primeiro acesso ao feed de oportunidades relevantes em menos de 2 minutos.
- **SC-003**: Uma sabatina completa (4–6 trocas + parecer) termina em menos de 5 minutos, e o parecer cita ao menos um critério ou exigência real do edital.
- **SC-004**: 100% dos pareceres incluem nota, gaps e documentos faltantes; nenhum inventa requisitos ausentes do edital.
- **SC-005**: Alertas por email chegam até 24h após a publicação de uma oportunidade compatível, com zero duplicatas por par perfil+oportunidade.
- **SC-006**: O fluxo de cobrança completo (checkout → confirmação → plano ativo) fecha em menos de 3 minutos no ambiente de teste.
- **SC-007**: O demo end-to-end (perfil → radar → sabatina → parecer → pipeline) roda ao vivo sem intervenção manual em menos de 3 minutos — cabe no vídeo de submissão.

## Assumptions

- As fontes oficiais seguem públicas e sem autenticação durante o período do hack; instâncias fora do ar ou com bloqueio de automação entram por coleta alternativa e não derrubam o catálogo.
- O público-alvo primário é o artista/produtor cultural independente brasileiro (PF, MEI, coletivo ou pequena PJ); pessoas jurídicas grandes e editais internacionais ficam fora do escopo do MVP.
- A interface é web em português brasileiro; mobile via web responsiva — app nativo fora de escopo.
- Sabatina por voz em tempo real é desejável, mas o MVP garante texto; voz é incremento se o prazo permitir.
- O escopo de "oportunidades" do MVP é fomento público (editais, prêmios, residências); prospecção ativa de gigs/casas de show é roadmap, não compromisso de entrega.
- Pagamentos operam em ambiente de teste/sandbox durante o hack; produção real depende de cadastro completo do emissor.
- Dados de demonstração são sintéticos; apenas dados públicos de editais são reais.

## Addendum 09/11 — Escopo completo do coach (D011/D012/D013)

- **FR-019**: O sistema DEVE prospectar leads comerciais (casas de show, festivais, marcas, escolas, produtoras) por tipo+nicho+cidade via Firecrawl agent, deduplicar por perfil, e gerenciar funil próprio (novo→contatado→respondeu→negociando→fechado|perdido). Lead fechado DEVE poder virar gig.
- **FR-020**: O sistema DEVE manter agenda de trabalhos (shows, aulas, gravações) com data, local, cachê e status (marcado→feito→pago|cancelado), e consolidar totais a-receber/recebido por perfil.
- **FR-021**: O sistema DEVE oferecer sabatina por voz via Agora Conversational AI, mantendo o prompt/rubrica no servidor (endpoint OpenAI-compatível `/api/voice-llm` → Gemini). Fallback textual obrigatório.
- **FR-022 (roadmap)**: Gerador de material (EPK/release em PDF) via job assíncrono do agente — fora do MVP da demo mas dentro do framing coach.
