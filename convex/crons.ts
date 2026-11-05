import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily("ingest-mapas", { hourUTC: 9, minuteUTC: 0 }, internal.ingest.run);
crons.daily("alerts-match", { hourUTC: 10, minuteUTC: 0 }, internal.alerts.run);

export default crons;
