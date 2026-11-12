import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { pdfSafe } from "@/lib/pdfText";

// Rider técnico — estrutura canônica (LL Cultural/riders reais): capa, formação,
// MAPA DE PALCO desenhado top-down, input list, monitoração, backline, horários, camarim.
// Rider de hospitalidade vai separado por convenção de mercado — aqui como seção final.
export async function POST(req: Request) {
  try {
    const { profile, rider } = (await req.json()) as {
      profile: { name: string; city?: string; phone?: string };
      rider: {
        name: string;
        techContact?: string;
        members: { position: string; instrument: string; vocals?: boolean }[];
        inputs: { channel: number; source: string; mic: string }[];
        monitors?: string;
        backlineOwn?: string;
        backlineVenue?: string;
        hospitality?: string;
        notes?: string;
      };
    };
    if (!profile?.name || !rider?.name || !rider.members?.length) {
      return Response.json({ error: "profile + rider.members required" }, { status: 400 });
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
        let cur = "";
        for (const w of para.split(" ")) {
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
        page.drawText(pdfSafe(l), { x, y, size, font, color });
        y -= size + 5;
      }
    };
    const section = (title: string) => {
      y -= 6;
      line(title, 10.5, bold, 60, accent);
      y -= 2;
    };

    // CAPA
    page.drawText(pdfSafe("RIDER TÉCNICO"), { x: 60, y, size: 16, font: bold, color: accent });
    y -= 22;
    line(`${profile.name} — ${rider.name}`, 13, bold);
    line(`Versão ${new Date().toLocaleDateString("pt-BR")}${profile.city ? ` · base ${profile.city}` : ""}`, 9, regular, 60, gray);
    if (rider.techContact ?? profile.phone) {
      line(`Contato técnico: ${rider.techContact ?? profile.phone}`, 9, regular, 60, gray);
    }
    y -= 12;

    // 1. FORMAÇÃO
    section("1. FORMAÇÃO");
    for (const m of rider.members) {
      line(`${m.position} — ${m.instrument}${m.vocals ? " (+ voz)" : ""}`, 10);
    }
    line(`Total em palco: ${rider.members.length}`, 9.5, regular, 60, gray);

    // 2. MAPA DE PALCO (desenho top-down)
    section("2. MAPA DE PALCO");
    const mapH = 190, mapX = 60, mapW = 475, mapTop = y;
    if (mapTop - mapH < 70) { page = doc.addPage([595, 842]); y = 790; }
    const top = y;
    // palco
    page.drawRectangle({ x: mapX, y: top - mapH, width: mapW, height: mapH, borderColor: ink, borderWidth: 1.2 });
    // plateia
    page.drawLine({ start: { x: mapX - 10, y: top - mapH - 18 }, end: { x: mapX + mapW + 10, y: top - mapH - 18 }, thickness: 0.8, color: gray });
    page.drawText(pdfSafe("P L A T E I A"), { x: mapX + mapW / 2 - 30, y: top - mapH - 32, size: 8, font: regular, color: gray });
    // músicos: posições distribuídas — fundo bateria, laterais instrumentos, frente vozes
    const n = rider.members.length;
    rider.members.forEach((m, i) => {
      const isDrum = /bater|drum/i.test(m.instrument);
      const isVocal = m.vocals && !isDrum;
      // posição: bateria centro-fundo; demais em arco na frente
      const px = isDrum ? mapX + mapW / 2 : mapX + 60 + (i / Math.max(n - 1, 1)) * (mapW - 120);
      const py = isDrum ? top - mapH + 35 : top - 60 - (i % 2) * 25;
      page.drawCircle({ x: px, y: py, size: 11, borderColor: accent, borderWidth: 1.4 });
      page.drawText(pdfSafe(String(i + 1)), { x: px - 2.5, y: py - 3.5, size: 8, font: bold, color: accent });
      const lbl = `${m.instrument}${m.vocals ? " +voz" : ""}`;
      page.drawText(pdfSafe(lbl.slice(0, 16)), { x: px - lbl.length * 1.6, y: py + 16, size: 7, font: regular, color: ink });
      // retorno de monitor na frente
      if (isVocal || i === 0) {
        page.drawRectangle({ x: px - 8, y: top - 14, width: 16, height: 8, borderColor: gray, borderWidth: 0.8 });
        page.drawText(pdfSafe(`M${i + 1}`), { x: px - 5, y: top - 12, size: 6, font: regular, color: gray });
      }
    });
    y = top - mapH - 48;

    // 3. INPUT LIST
    section("3. INPUT LIST");
    const cols = [60, 90, 260, 430];
    line("CANAL   FONTE                    MIC/DI                PEDESTAL", 8.5, bold, 60, gray);
    for (const inp of rider.inputs.sort((a, b) => a.channel - b.channel)) {
      page.drawText(pdfSafe(String(inp.channel)), { x: cols[0], y, size: 9.5, font: regular, color: ink });
      page.drawText(pdfSafe(inp.source.slice(0, 28)), { x: cols[1], y, size: 9.5, font: regular, color: ink });
      page.drawText(pdfSafe(inp.mic.slice(0, 28)), { x: cols[2], y, size: 9.5, font: regular, color: ink });
      y -= 15;
      if (y < 70) { page = doc.addPage([595, 842]); y = 790; }
    }

    // 4-7. textos
    section("4. MONITORAÇÃO");
    line(rider.monitors ?? `${Math.min(rider.members.length, 4)} vias de retorno — mix individual por posição`, 9.5);
    section("5. BACKLINE");
    line(`A banda leva: ${rider.backlineOwn ?? "instrumentos, cabos, pedais e acessórios pessoais"}`, 9.5);
    line(`A casa fornece: ${rider.backlineVenue ?? "a definir com a produção do local"}`, 9.5);
    section("6. HORÁRIOS DO DIA");
    line("Carga 4h antes do show · montagem · soundcheck mínimo 45–60min com line check · portas · show · desmontagem.", 9.5);
    section("7. CAMARIM E HOSPITALIDADE");
    line(rider.hospitality ?? `Camarim com espelho e banheiro · água mineral p/ ${rider.members.length} pessoas · alimentação quente ou lanche · estacionamento próximo ao palco`, 9.5);
    if (rider.notes) { section("OBSERVAÇÕES"); line(rider.notes, 9.5); }

    page.drawText(pdfSafe(`Rider técnico — ${profile.name} · gerado pelo Manager em ${new Date().toLocaleDateString("pt-BR")}`), {
      x: 60, y: 36, size: 7.5, font: regular, color: rgb(0.55, 0.55, 0.6),
    });

    const pdf = await doc.save();
    return new Response(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="rider-${rider.name.replace(/\W+/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
