import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { pdfSafe } from "@/lib/pdfText";

// Gera proposta/orçamento de alta conversão em PDF — o ativo que o Thiago Kiss
// vende como bônus-estrela, produzido aqui em 1 clique a partir do lead.
export async function POST(req: Request) {
  try {
    const { profile, lead, gig } = (await req.json()) as {
      profile: { name: string; personType?: string; portfolioUrl?: string; email?: string };
      lead: { name: string; kind: string; city?: string };
      gig: { title?: string; date?: string; fee?: number; scope?: string };
    };
    if (!profile?.name || !lead?.name) {
      return Response.json({ error: "profile + lead required" }, { status: 400 });
    }

    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const ink = rgb(0.1, 0.1, 0.12);
    const accent = rgb(0.06, 0.55, 0.38);

    let y = 790;
    const line = (text: string, size = 11, font = regular, x = 60, color = ink) => {
      page.drawText(pdfSafe(text), { x, y, size, font, color });
      y -= size + 7;
    };
    const gap = (n = 10) => (y -= n);

    page.drawText(pdfSafe("PROPOSTA DE APRESENTAÇÃO ARTÍSTICA"), { x: 60, y, size: 17, font: bold, color: accent });
    y -= 24;
    page.drawText(pdfSafe(`Emitida em ${new Date().toLocaleDateString("pt-BR")} · válida por 15 dias`), { x: 60, y, size: 9, font: regular, color: rgb(0.45, 0.45, 0.5) });
    y -= 26;

    line("ARTISTA", 10, bold, 60, accent);
    line(`${profile.name}${profile.personType ? ` — ${profile.personType}` : ""}`, 13, bold);
    if (profile.portfolioUrl) line(profile.portfolioUrl, 9, regular, 60, rgb(0.35, 0.35, 0.45));
    if (profile.email) line(profile.email, 9, regular, 60, rgb(0.35, 0.35, 0.45));
    gap();

    line("CONTRATANTE", 10, bold, 60, accent);
    line(`${lead.name} — ${lead.kind.replaceAll("_", " ")}${lead.city ? ` · ${lead.city}` : ""}`, 12);
    gap();

    line("ESCOPO", 10, bold, 60, accent);
    line(gig.title ?? "Apresentação artística ao vivo", 12, bold);
    if (gig.date) line(`Data: ${gig.date}`, 10);
    line(
      gig.scope ??
        "Apresentação de até 120 minutos, com repertório combinado previamente com o contratante. Inclui ensaio/soundcheck no dia e material promocional do artista para divulgação do evento.",
      10
    );
    gap();

    line("INVESTIMENTO", 10, bold, 60, accent);
    if (gig.fee) {
      page.drawText(pdfSafe(`R$ ${gig.fee.toLocaleString("pt-BR")}`), { x: 60, y, size: 22, font: bold, color: ink });
      y -= 30;
    }
    line("Condições: 50% na assinatura da proposta, 50% até a data do evento.", 10);
    line("Pagamento via Pix ou transferência. Nota fiscal/recibo emitido pelo artista.", 10);
    gap();

    line("CONDIÇÕES GERAIS", 10, bold, 60, accent);
    for (const t of [
      "· Cancelamento: até 15 dias antes, sem ônus; após, retenção do sinal.",
      "· Estrutura técnica (som, iluminação, palco) sob responsabilidade do contratante, salvo combinado diferente.",
      "· Alimentação e deslocamento podem ser cotados à parte conforme a cidade.",
      "· Esta proposta não substitui contrato — ambas as partes podem formalizar instrumento próprio.",
    ]) line(t, 9, regular, 60, rgb(0.3, 0.3, 0.35));
    gap(16);

    page.drawText(pdfSafe("Gerado pelo Manager — o coach de IA do trabalhador da arte"), {
      x: 60, y: 40, size: 8, font: regular, color: rgb(0.55, 0.55, 0.6),
    });

    const pdf = await doc.save();
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="proposta-${profile.name.replace(/\W+/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
