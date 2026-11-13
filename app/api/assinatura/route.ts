import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { pdfSafe } from "@/lib/pdfText";

// PDF do documento com as assinaturas: texto, depois um bloco por pessoa na
// ordem em que assinou (traço + nome + CPF + data/hora) e a trilha no rodapé.
// GET /api/assinatura?link=<link de quem assina>  ou  ?id=<doc>&token=<sessão do dono>
export async function GET(req: Request) {
  const u = new URL(req.url);
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
  const link = u.searchParams.get("link") ?? undefined;
  const id = u.searchParams.get("id") ?? undefined;
  const token = u.searchParams.get("token") ?? undefined;
  const d = (await convex
    .query(api.signDocs.forPdf, { link, id: id as never, token })
    .catch(() => null)) as null | {
    title: string;
    body: string;
    from: string;
    createdAt: number;
    signers: { name: string; role?: string; order: number; status: string; cpf?: string; rg?: string; address?: string; signature?: string; signedAt?: number }[];
  };
  if (!d) return Response.json({ error: "documento não encontrado" }, { status: 404 });

  const doc = await PDFDocument.create();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.1, 0.1, 0.12);
  const gray = rgb(0.42, 0.42, 0.46);
  let page = doc.addPage([595, 842]);
  let y = 790;
  const newPage = () => { page = doc.addPage([595, 842]); y = 790; };
  const wrap = (text: string, font = regular, size = 10.5, maxW = 475): string[] => {
    const out: string[] = [];
    for (const para of pdfSafe(text).split("\n")) {
      let cur = "";
      for (const w of para.split(" ")) {
        const t = cur ? `${cur} ${w}` : w;
        if (font.widthOfTextAtSize(t, size) > maxW && cur) { out.push(cur); cur = w; } else cur = t;
      }
      out.push(cur);
    }
    return out;
  };
  const write = (text: string, size = 10.5, font = regular, color = ink, gap = 5) => {
    for (const l of wrap(text, font, size)) {
      if (y < 70) newPage();
      page.drawText(l, { x: 60, y, size, font, color });
      y -= size + gap;
    }
  };

  write(d.title.toUpperCase(), 14, bold, ink, 8);
  y -= 6;
  write(d.body.replace(/\*\*/g, ""), 10.5);
  y -= 18;

  const fmt = (ms: number) => new Date(ms).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  const ordered = [...d.signers].sort((a, b) => a.order - b.order);
  for (const s of ordered) {
    if (y < 190) newPage();
    if (s.signature) {
      try {
        const png = await doc.embedPng(Buffer.from(s.signature.split(",")[1], "base64"));
        const h = 60;
        const w = Math.min(220, (png.width / png.height) * h);
        page.drawImage(png, { x: 60, y: y - h, width: w, height: h });
      } catch { /* traço ilegível: fica só a linha */ }
    }
    y -= 66;
    page.drawLine({ start: { x: 60, y }, end: { x: 300, y }, thickness: 0.8, color: ink });
    y -= 14;
    write(`${s.name}${s.role ? ` — ${s.role}` : ""}`, 10, bold, ink, 3);
    if (s.status === "assinado") {
      write(`CPF ${s.cpf?.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") ?? "—"}${s.rg ? ` · RG ${s.rg}` : ""}`, 9, regular, gray, 3);
      if (s.address) write(s.address, 9, regular, gray, 3);
      write(`Assinou em ${fmt(s.signedAt!)} (${s.order}º a assinar)`, 9, regular, gray, 3);
    } else {
      write("Aguardando assinatura", 9, regular, gray, 3);
    }
    y -= 16;
  }

  const pages = doc.getPages();
  pages.forEach((p, i) =>
    p.drawText(pdfSafe(`${d.title} · ${d.from} · criado em ${fmt(d.createdAt)} · assinatura eletrônica pelo Manager · pág. ${i + 1}/${pages.length}`).slice(0, 140), {
      x: 60, y: 34, size: 7, font: regular, color: rgb(0.55, 0.55, 0.6),
    })
  );

  const pdf = await doc.save();
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdfSafe(d.title).replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 60) || "documento"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
