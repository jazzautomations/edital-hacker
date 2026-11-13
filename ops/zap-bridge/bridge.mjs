// Ponte Manager <-> servidor de WhatsApp (Evolution API local).
// Pega tarefas no Convex (criar conexão/QR, enviar mensagem, desconectar) e
// executa no Evolution da máquina. As respostas e o QR voltam pelo webhook
// que cada instância mgr-* manda direto pro Convex. Nada daqui fica exposto.
// Config: CONVEX_URL, ZAP_SECRET, EVOLUTION_URL (padrão localhost:8080),
// EVOLUTION_KEY (ou lida do container "evolution").
import { execSync } from "node:child_process";

const CONVEX = process.env.CONVEX_URL;
const SECRET = process.env.ZAP_SECRET;
const EVO = process.env.EVOLUTION_URL ?? "http://localhost:8080";
const KEY =
  process.env.EVOLUTION_KEY ??
  execSync(`docker inspect evolution --format '{{range .Config.Env}}{{println .}}{{end}}'`)
    .toString()
    .split("\n")
    .find((l) => l.startsWith("AUTHENTICATION_API_KEY="))
    ?.split("=")[1];
if (!CONVEX || !SECRET || !KEY) throw new Error("faltou CONVEX_URL, ZAP_SECRET ou a chave do Evolution");
const SITE = CONVEX.replace(".convex.cloud", ".convex.site");
const log = (...a) => console.log(new Date().toISOString(), ...a);

async function convex(kind, path, args) {
  const r = await fetch(`${CONVEX}/api/${kind}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  const j = await r.json();
  if (j.status !== "success") throw new Error(`${path}: ${j.errorMessage ?? r.status}`);
  return j.value;
}
async function evo(method, path, body) {
  const r = await fetch(`${EVO}${path}`, {
    method,
    headers: { apikey: KEY, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25000),
  });
  const text = await r.text();
  let j = null;
  try { j = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, j, text };
}
// o QR que vem na resposta também vai pro Manager pelo mesmo caminho do webhook
async function pushQr(instance, base64) {
  if (!base64) return;
  await fetch(`${SITE}/zap/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-zap-secret": SECRET },
    body: JSON.stringify({ event: "qrcode.updated", instance, data: { qrcode: { base64 } } }),
  });
}

async function run(job) {
  const { kind, instance } = job;
  if (!/^mgr-[a-z0-9]+$/.test(instance)) throw new Error("instância fora do padrão mgr-*");
  if (kind === "criar") {
    const c = await evo("POST", "/instance/create", {
      instanceName: instance,
      integration: "WHATSAPP-BAILEYS",
      qrcode: true,
      webhook: {
        url: `${SITE}/zap/webhook`,
        byEvents: false,
        base64: false,
        headers: { "x-zap-secret": SECRET },
        events: ["QRCODE_UPDATED", "CONNECTION_UPDATE", "MESSAGES_UPSERT"],
      },
    });
    if (c.ok) return pushQr(instance, c.j?.qrcode?.base64);
    // já existe: pede QR novo
    const k = await evo("GET", `/instance/connect/${instance}`);
    if (!k.ok) throw new Error(`connect ${k.status}: ${k.text.slice(0, 200)}`);
    return pushQr(instance, k.j?.base64);
  }
  if (kind === "enviar") {
    const s = await evo("POST", `/message/sendText/${instance}`, { number: job.phone, text: job.text });
    if (!s.ok) throw new Error(`send ${s.status}: ${s.text.slice(0, 200)}`);
    return;
  }
  if (kind === "desconectar") {
    await evo("DELETE", `/instance/logout/${instance}`);
    await evo("DELETE", `/instance/delete/${instance}`);
    return;
  }
  throw new Error(`tarefa desconhecida: ${kind}`);
}

async function tick() {
  const jobs = await convex("mutation", "zap:bridgeClaim", { secret: SECRET });
  for (const job of jobs) {
    try {
      await run(job);
      await convex("mutation", "zap:bridgeDone", { secret: SECRET, id: job.id, ok: true });
      log("ok", job.kind, job.instance, job.phone ?? "");
    } catch (e) {
      await convex("mutation", "zap:bridgeDone", { secret: SECRET, id: job.id, ok: false, error: String(e) }).catch(() => {});
      log("erro", job.kind, job.instance, String(e));
    }
    if (job.kind === "enviar") await new Promise((r) => setTimeout(r, 1500)); // ritmo humano no envio
  }
}

log("ponte no ar", CONVEX);
for (;;) {
  try { await tick(); } catch (e) { log("tick", String(e)); }
  await new Promise((r) => setTimeout(r, 2000));
}
