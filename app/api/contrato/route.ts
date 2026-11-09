import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Contrato de apresentação artística — estrutura canônica do mercado BR
// (modelo LL Cultural/SEDEP: 10 cláusulas + checklist de negociação em anexo).
// Completa o arco: lead → proposta → contrato. Não substitui assessoria jurídica.
export async function POST(req: Request) {
  try {
    const { profile, lead, gig } = (await req.json()) as {
      profile: { name: string; personType?: string; email?: string; cpfCnpj?: string };
      lead: { name: string; kind?: string; city?: string; cnpj?: string };
      gig: {
        title?: string; date?: string; venue?: string; fee?: number;
        durationMin?: number; lineup?: string; soundcheckMin?: number;
      };
    };
    if (!profile?.name || !lead?.name || !gig?.date || !gig?.fee) {
      return Response.json(
        { error: "profile.name + lead.name + gig.date + gig.fee required" },
        { status: 400 }
      );
    }

    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const ink = rgb(0.1, 0.1, 0.12);
    const accent = rgb(0.06, 0.55, 0.38);
    const gray = rgb(0.4, 0.4, 0.45);

    const wrap = (text: string, max = 95): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length > max) { lines.push(cur.trim()); cur = w; }
        else cur += " " + w;
      }
      if (cur.trim()) lines.push(cur.trim());
      return lines;
    };

    let page = doc.addPage([595, 842]);
    let y = 790;
    const line = (text: string, size = 10, font = regular, x = 60, color = ink) => {
      for (const l of wrap(text, x > 60 ? 85 : 95)) {
        if (y < 70) { page = doc.addPage([595, 842]); y = 790; }
        page.drawText(l, { x, y, size, font, color });
        y -= size + 5;
      }
    };
    const clause = (n: string, title: string, body: string) => {
      line(`CLÁUSULA ${n} — ${title}`, 9.5, bold, 60, accent);
      line(body, 9.5);
      y -= 6;
    };

    page.drawText("CONTRATO DE PRESTAÇÃO DE SERVIÇO ARTÍSTICO", {
      x: 60, y, size: 15, font: bold, color: accent,
    });
    y -= 30;

    line("CONTRATANTE", 9, bold, 60, accent);
    line(`${lead.name}${lead.cnpj ? `, CNPJ ${lead.cnpj}` : ""}${lead.city ? ` — ${lead.city}` : ""}`, 10);
    y -= 8;
    line("CONTRATADO(A)", 9, bold, 60, accent);
    line(`${profile.name}${profile.personType ? ` (${profile.personType})` : ""}${profile.cpfCnpj ? `, CPF/CNPJ ${profile.cpfCnpj}` : ""}${profile.email ? ` — ${profile.email}` : ""}`, 10);
    y -= 12;

    clause("1ª", "DO OBJETO",
      `Apresentação artística "${gig.title ?? "show ao vivo"}"${gig.lineup ? ` na formação ${gig.lineup}` : ""} em ${gig.date}` +
      `${gig.venue ? `, no local ${gig.venue}` : ""}` +
      `, com duração de até ${gig.durationMin ?? 120} minutos. Serviço de natureza pessoal e intransferível.`);
    clause("2ª", "DA GRADE DO DIA",
      `Chegada e montagem: até 4h antes do show. Passagem de som: mínimo de ${gig.soundcheckMin ?? 45} minutos, encerrada antes da abertura de portas. ` +
      `Atraso da CONTRATANTE ou de outras atrações não reduz o cachê nem a duração contratada; prorrogação de horário depende de acordo à parte.`);
    clause("3ª", "DO CACHÊ E DO PAGAMENTO",
      `Cachê total de R$ ${gig.fee.toLocaleString("pt-BR")}, pago: 50% na assinatura deste contrato e 50% até o horário de início da apresentação, via Pix ou transferência, ` +
      `conforme dados bancários informados pelo(a) CONTRATADO(A), que emite nota fiscal ou recibo correspondente.`);
    clause("4ª", "DA ESTRUTURA E RESPONSABILIDADES DE PRODUÇÃO",
      "A CONTRATANTE fornece: local com alvarás e licenças, palco coberto e montado, sistema de PA e monitoração dimensionados ao público previsto, iluminação, energia estabilizada e aterrada, e equipe local de apoio para carga/descarga.");
    clause("5ª", "DO RIDER TÉCNICO E DE CAMARIM",
      "O rider técnico e o rider de hospitalidade integram este contrato como anexos, com versão e data. Camarim com mesa, cadeiras, espelho, banheiro e água disponível 1h antes da passagem de som.");
    clause("6ª", "DA LOGÍSTICA",
      "Transporte, hospedagem, alimentação e pedágios, quando aplicáveis, são custeados pela CONTRATANTE conforme combinado em proposta anexa — ou já embutidos no cachê, caso assim acordado por escrito.");
    clause("7ª", "DA DIVULGAÇÃO",
      "A CONTRATANTE pode divulgar o evento usando nome e imagem do(a) CONTRATADO(A) exclusivamente para promover esta apresentação, mediante aprovação prévia da arte final pelo(a) CONTRATADO(A).");
    clause("8ª", "DE IMAGEM E GRAVAÇÃO",
      "Filmagem, gravação de áudio ou transmissão da apresentação, total ou parcial, exige autorização prévia e por escrito do(a) CONTRATADO(A), definindo finalidade e meios de veiculação.");
    clause("9ª", "DOS DIREITOS AUTORAIS",
      "O recolhimento de direitos autorais de execução pública (ECAD) é de responsabilidade da CONTRATANTE/organizadora do evento. O(A) CONTRATADO(A) entrega a setlist para fins desse recolhimento.");
    clause("10ª", "DO CANCELAMENTO E FORÇA MAIOR",
      "Cancelamento pela CONTRATANTE: até 15 dias antes, devolução integral do sinal; entre 7 e 14 dias, retenção de 50%; menos de 7 dias, retenção integral. Por motivo de força maior (doença comprovada, calamidade, impossibilidade do local), as partes negociam remarcação em até 90 dias; despesas não recuperáveis já comprometidas serão comprovadas e repassadas.");
    clause("11ª", "DAS DISPOSIÇÕES GERAIS",
      `Este contrato não gera vínculo empregatício e constitui título executivo extrajudicial (art. 784, III, CPC). O(A) CONTRATADO(A) responde pelos encargos fiscais de sua receita. Foro: comarca de ${lead.city ?? "domicílio da CONTRATANTE"}, salvo acordo diverso.`);

    y -= 20;
    if (y < 160) { page = doc.addPage([595, 842]); y = 790; }
    line(`_______________________________          ${new Date().toLocaleDateString("pt-BR")}`, 10);
    line(`${lead.name} — CONTRATANTE`, 9, regular, 60, gray);
    y -= 18;
    line("_______________________________", 10);
    line(`${profile.name} — CONTRATADO(A)`, 9, regular, 60, gray);
    y -= 18;
    for (const t of ["Testemunha 1 — nome e CPF", "Testemunha 2 — nome e CPF"]) {
      line("_______________________________", 10);
      line(t, 9, regular, 60, gray);
      y -= 10;
    }

    // Anexo: checklist de negociação — nenhum modelo público traz isso.
    page = doc.addPage([595, 842]); y = 790;
    page.drawText("ANEXO — CHECKLIST ANTES DE ASSINAR", { x: 60, y, size: 13, font: bold, color: accent });
    y -= 26;
    for (const item of [
      "[ ] O valor está BRUTO ou LÍQUIDO? Quem paga os impostos/retenções?",
      "[ ] O saldo vence antes ou depois de subir no palco? (exija: até o início do show)",
      "[ ] O rider técnico foi lido e confirmado por quem contrata? Versão datada anexada?",
      "[ ] Atraso de outras atrações não pode comer teu tempo de palco — tá escrito?",
      "[ ] ECAD: confirmado que recolhe quem organiza, não você?",
      "[ ] Gravação/livestream: autorizada? Pra qual uso? (promoção ≠ exploração comercial)",
      "[ ] Cancelamento por chuva/força maior: quem absorve as despesas já feitas?",
      "[ ] Deslocamento e alimentação: embutidos no cachê ou à parte? Por escrito.",
      "[ ] 2 testemunhas com CPF — é o que faz disso título executivo extrajudicial.",
      "[ ] Comparou o cachê com teu piso de custo? (calculadora no /agenda)",
    ]) {
      line(item, 10);
      y -= 4;
    }

    page.drawText("Modelo gerado pelo Manager — o coach de IA do trabalhador da arte. Não substitui assessoria jurídica.", {
      x: 60, y: 36, size: 7.5, font: regular, color: rgb(0.55, 0.55, 0.6),
    });

    const pdf = await doc.save();
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="contrato-${profile.name.replace(/\W+/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
