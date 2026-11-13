/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as alerts from "../alerts.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as contacts from "../contacts.js";
import type * as crons from "../crons.js";
import type * as digest from "../digest.js";
import type * as discover from "../discover.js";
import type * as documents from "../documents.js";
import type * as dossier from "../dossier.js";
import type * as enrich from "../enrich.js";
import type * as gigs from "../gigs.js";
import type * as http from "../http.js";
import type * as inbound from "../inbound.js";
import type * as ingest from "../ingest.js";
import type * as leads from "../leads.js";
import type * as monitors from "../monitors.js";
import type * as onboard from "../onboard.js";
import type * as opportunities from "../opportunities.js";
import type * as pendingActions from "../pendingActions.js";
import type * as pipeline from "../pipeline.js";
import type * as pncp from "../pncp.js";
import type * as profiles from "../profiles.js";
import type * as replyDetect from "../replyDetect.js";
import type * as riders from "../riders.js";
import type * as sabatina from "../sabatina.js";
import type * as signDocs from "../signDocs.js";
import type * as usage from "../usage.js";
import type * as voice from "../voice.js";
import type * as zap from "../zap.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  alerts: typeof alerts;
  auth: typeof auth;
  billing: typeof billing;
  contacts: typeof contacts;
  crons: typeof crons;
  digest: typeof digest;
  discover: typeof discover;
  documents: typeof documents;
  dossier: typeof dossier;
  enrich: typeof enrich;
  gigs: typeof gigs;
  http: typeof http;
  inbound: typeof inbound;
  ingest: typeof ingest;
  leads: typeof leads;
  monitors: typeof monitors;
  onboard: typeof onboard;
  opportunities: typeof opportunities;
  pendingActions: typeof pendingActions;
  pipeline: typeof pipeline;
  pncp: typeof pncp;
  profiles: typeof profiles;
  replyDetect: typeof replyDetect;
  riders: typeof riders;
  sabatina: typeof sabatina;
  signDocs: typeof signDocs;
  usage: typeof usage;
  voice: typeof voice;
  zap: typeof zap;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
