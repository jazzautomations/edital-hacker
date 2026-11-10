import { NextResponse } from "next/server";
import { buildRoteiroXlsx, type RoteiroEvento, type RoteiroFaixa } from "@/lib/ecad";

// Gera o roteiro musical ECAD (.xlsx) de um gig — o documento que impede o
// dinheiro do show de cair no rateio e pagar outros autores.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const evento = body.evento as RoteiroEvento;
    const faixas = (body.faixas ?? []) as RoteiroFaixa[];
    if (!evento?.artista || !evento?.evento || !faixas.length) {
      return NextResponse.json(
        { error: "evento {artista,evento,local,data} + faixas[] obrigatórios" },
        { status: 400 }
      );
    }
    const buf = await buildRoteiroXlsx(evento, faixas);
    const fname = `roteiro-ecad-${evento.data?.slice(0, 10) ?? "show"}-${evento.artista
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 30)}.xlsx`;
    return new Response(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fname}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
