import { NextResponse } from "next/server";
import { chat, llmConfigured } from "@/lib/llm";

// Revisor de contrato — cola o contrato que chegou e recebe parecer com as
// 8 red flags canônicas + âncora na Portaria MTP 671/2021 (modelos
// obrigatórios pra músicos/técnicos) e no que é referência sadia.

export const CONTRACT_REVIEW_SYSTEM = `Você é o jurídico de plantão de um empresário artístico brasileiro. Revise o contrato de apresentação/serviço artístico e devolva um PARECER em markdown curto:

## Veredito — assina? / assina depois de ajustar / não assina (1 linha)
## 🚩 Red flags encontradas — cite a cláusula e por que é risco:
Checklist: (1) pagamento "após o evento" sem data/prazo — referência sadia: sinal 30-50% + saldo até 30min antes do palco; (2) exclusividade ampla/sem raio+prazo — só vale por praça e dias definidos; (3) cessão de imagem/direitos "presentes e futuros, qualquer meio" — gravação só com autorização específica; (4) ECAD empurrado pro artista — quem paga é o contratante; (5) cancelamento unilateral/sem multa progressiva; (6) couvert retido — ilegal onde há lei de couvert; (7) sem grade do dia/responsabilidades de estrutura/alvarás; (8) foro distante da cidade do artista.
## ✅ O que tá ok — pontos bem redigidos
## ✏️ Redação sugerida — pra cada red flag, a cláusula que pedir de volta (1 frase cada)
Âncoras: Portaria MTP 671/2021 (modelos obrigatórios: exclusividade não pode impedir atividade diversa; nota contratual só p/ ≤7 dias consecutivos), Regulamento ECAD (licença é do usuário/promotor).
Seja direto; só afirme o que está no texto. Termine com "⚠️ Parecer orientativo, não substitui advogado."`;

export async function POST(req: Request) {
  if (!llmConfigured()) {
    return NextResponse.json({ error: "LLM_API_KEY not configured" }, { status: 503 });
  }
  const { text } = (await req.json()) as { text: string };
  if (!text || text.length < 200) {
    return NextResponse.json({ error: "cola o texto do contrato (min 200 chars)" }, { status: 400 });
  }
  try {
    const parecer = await chat([
      { role: "system", content: CONTRACT_REVIEW_SYSTEM },
      { role: "user", content: text.slice(0, 20000) },
    ]);
    return NextResponse.json({ parecer });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 200) }, { status: 500 });
  }
}
