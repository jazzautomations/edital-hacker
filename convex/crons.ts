import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("ingest-mapas", { hourUTC: 9, minuteUTC: 0 }, internal.ingest.run);
crons.daily("alerts-match", { hourUTC: 10, minuteUTC: 0 }, internal.alerts.run);
crons.daily(
  "enrich-batch",
  { hourUTC: 11, minuteUTC: 0 },
  internal.enrich.enrichBatch,
  { limit: 20 }
);
// Fontes com WAF/fora da API: descoberta via Firecrawl agent, 1x/semana (custa créditos)
crons.cron("discover-blocked", "0 9 * * 1", internal.discover.discoverBlocked);
// Digest do coach: segunda 12h UTC = 9h em Brasília — "sua semana" por email
crons.cron("weekly-digest", "0 12 * * 1", internal.digest.run);
// Reply-detect: resposta de contratante no Gmail → lead move no funil (2x/dia)
crons.cron("reply-detect", "0 13,21 * * *", internal.replyDetect.run);

export default crons;
