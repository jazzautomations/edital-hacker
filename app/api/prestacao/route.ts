import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Relatório de Objeto da Execução Cultural — modelo Anexo V (PNAB/Mapas Culturais,
// Marco do Fomento Lei 14.903/2024). A prestação real é preenchida na plataforma;
// o coach gera o documento pronto pra colar/anexar — ninguém mais faz isso.
export async function POST(req: Request) {
  try {
    const { profile, opportunity, exec } = (await req.json()) as {
      profile: { name: string; personType?: string; cpfCnpj?: string };
      opportunity: { name: string; sourceName?: string; totalResource?: number };
      exec: {
        resumo?: string;
        acoesStatus?: string; // todas conforme planejado | adaptadas | parte não feita
        acoes?: string; // datas, locais, alterações
        metas?: { texto: string; status: "integral" | "parcial" | "nao"; justificativa?: string }[];
        produtos?: string; // o que foi gerado + como fica acessível
        publico?: string; // quantidade + mecanismo de mensuração
        equipe?: string;
        locais?: string;
        divulgacao?: string;
        contrapartida?: string;
        anexos?: string;
      };
    };
    if (!profile?.name || !opportunity?.name) {
      return Response.json({ error: "profile + opportunity required" }, { status: 400 });
    }

    const doc = await PDFDocument.create();
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const ink = rgb(0.1, 0.1, 0.12);
    const accent = rgb(0.06, 0.55, 0.38);
    const gray = rgb(0.4, 0.4, 0.45);

    const wrap = (text: string, max = 95): string[] => {
      const out: string[] = [];
      for (const para of text.split("\n")) {
        const words = para.split(" ");
        let cur = "";
        for (const w of words) {
          if ((cur + " " + w).trim().length > max) { out.push(cur.trim()); cur = w; }
          else cur += " " + w;
        }
        if (cur.trim()) out.push(cur.trim());
      }
      return out.length ? out : [""];
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
    const section = (n: string, title: string, body: string | undefined) => {
      line(`${n}. ${title}`, 10, bold, 60, accent);
      line(body || "(a preencher pelo proponente)", 9.5);
      y -= 8;
    };

    page.drawText("RELATÓRIO DE OBJETO DA EXECUÇÃO CULTURAL", { x: 60, y, size: 14, font: bold, color: accent });
    y -= 20;
    line("(modelo Anexo V — PNAB / Mapas Culturais)", 9, regular, 60, gray);
    y -= 24;

    line("1. DADOS DO PROJETO", 10, bold, 60, accent);
    line(`Projeto: ${opportunity.name}`, 10);
    line(`Proponente: ${profile.name}${profile.cpfCnpj ? ` — ${profile.cpfCnpj}` : ""}`, 10);
    line(`Fomento: ${opportunity.sourceName ?? "(órgão/edital)"}${opportunity.totalResource ? ` · valor repassado R$ ${opportunity.totalResource.toLocaleString("pt-BR")}` : ""}`, 10);
    line(`Termo de Execução Cultural nº: ______  Vigência: ____/____/____ a ____/____/____`, 10);
    line(`Data de entrega do relatório: ${new Date().toLocaleDateString("pt-BR")}`, 10);
    y -= 10;

    section("2", "RESULTADOS DO PROJETO",
      `2.1 Resumo da execução\n${exec.resumo ?? ""}\n\n` +
      `2.2 As ações planejadas foram realizadas?\n( ) todas conforme planejado  ( ) todas com adaptações  ( ) parte não feita  ( ) não conforme planejado` +
      `${exec.acoesStatus ? `\nMarcado: ${exec.acoesStatus}` : ""}\n\n` +
      `2.3 Ações desenvolvidas (datas, locais, horários, alterações e impactos)\n${exec.acoes ?? ""}`);

    line("2.4 CUMPRIMENTO DAS METAS", 10, bold, 60, accent);
    if (exec.metas?.length) {
      for (const m of exec.metas) {
        line(`Meta: ${m.texto}`, 9.5, bold);
        line(`Status: ${m.status === "integral" ? "integralmente cumprida" : m.status === "parcial" ? "parcialmente cumprida" : "não cumprida"}${m.justificativa ? ` — ${m.justificativa}` : ""}`, 9.5);
        y -= 4;
      }
    } else line("(listar cada meta do plano de trabalho aprovado e o status de cumprimento)", 9.5);
    y -= 8;

    section("3", "PRODUTOS GERADOS", exec.produtos);
    section("4", "PÚBLICO ALCANÇADO", exec.publico);
    section("5", "EQUIPE DO PROJETO", exec.equipe);
    section("6", "LOCAIS DE REALIZAÇÃO", exec.locais);
    section("7", "DIVULGAÇÃO DO PROJETO", exec.divulgacao);
    section("8", "CONTRAPARTIDA", exec.contrapartida);
    section("9", "AVALIAÇÃO DO ATINGIMENTO DOS OBJETIVOS", undefined);
    section("10", "ANEXOS",
      (exec.anexos ? `${exec.anexos}\n` : "") +
      "(listas de presença, relatório fotográfico, vídeos, depoimentos, clipping, folders com marcas obrigatórias)");

    y -= 16;
    if (y < 120) { page = doc.addPage([595, 842]); y = 790; }
    line("Declaro que as informações acima são verdadeiras.", 9.5);
    y -= 20;
    line("_______________________________", 10);
    line(`${profile.name} — proponente`, 9, regular, 60, gray);

    page.drawText("Gerado pelo Manager — o coach de IA do trabalhador da arte · confira o modelo oficial do SEU edital antes de entregar", {
      x: 60, y: 36, size: 7.5, font: regular, color: rgb(0.55, 0.55, 0.6),
    });

    const pdf = await doc.save();
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="prestacao-${profile.name.replace(/\W+/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
