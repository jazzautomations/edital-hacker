"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  IAgoraRTCClient,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

type VoiceStatus = "idle" | "connecting" | "live" | "ended" | "error";

interface VoiceSession {
  appId: string;
  channel: string;
  uid: number;
  token: string;
  agentId: string;
}

// Voz via Agora RTC + Conversational AI: POST /api/voice-session sobe o
// agente (ASR+LLM+TTS managed) num canal RTC; entramos no mesmo canal
// publicando o mic e tocando o áudio remoto. Dois modos:
//   sabatina — banca simulada com rubrica do edital + submit_verdict
//   coach    — o Manager vivo com memória da carreira + tools de execução
// O SDK entra por import() dinâmico no clique — fora do grafo de SSR/pré-render.
export default function VoiceSabatina({
  opportunityId,
  profileEmail,
  mode = "sabatina",
}: {
  opportunityId?: string;
  profileEmail: string;
  mode?: "sabatina" | "coach";
}) {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [agentOn, setAgentOn] = useState(false);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micRef = useRef<IMicrophoneAudioTrack | null>(null);
  const agentIdRef = useRef<string | null>(null);

  const cleanup = useCallback(async () => {
    try {
      micRef.current?.close();
    } catch {
      /* track já fechada */
    }
    micRef.current = null;
    try {
      await clientRef.current?.leave();
    } catch {
      /* já fora do canal */
    }
    clientRef.current = null;
    // desliga o agente no servidor — senão ele fica no canal até o idle_timeout
    const agentId = agentIdRef.current;
    agentIdRef.current = null;
    if (agentId) {
      void fetch(`/api/voice-session?agentId=${encodeURIComponent(agentId)}`, { method: "DELETE", keepalive: true }).catch(() => {});
    }
    setAgentOn(false);
  }, []);

  // sai do canal se a página desmontar (navegação, refresh)
  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, [cleanup]);

  async function connect() {
    if (status === "connecting" || status === "live") return;
    setStatus("connecting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/voice-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, profileEmail, mode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 503) {
          throw new Error(
            "Voz ainda não configurada no servidor — faltam as chaves AGORA_* no .env."
          );
        }
        if (res.status === 404) {
          throw new Error(
            "Perfil ou edital não encontrado — confere o email salvo e tenta de novo."
          );
        }
        throw new Error(data.error ?? `Falha ao criar sessão (HTTP ${res.status})`);
      }
      const session = data as VoiceSession;
      agentIdRef.current = (data as { agentId?: string }).agentId ?? null;

      // import dinâmico: agora-rtc-sdk-ng usa APIs de browser no escopo do módulo
      const AgoraRTC = (await import("agora-rtc-sdk-ng")).default;
      AgoraRTC.setLogLevel(4); // silencia logs do SDK no console da demo

      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (user, mediaType) => {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          user.audioTrack?.play();
          setAgentOn(true);
        }
      });
      // o agente é o único remote no canal — se ele sair (idle_timeout), encerra
      client.on("user-left", () => {
        void cleanup().then(() => setStatus("ended"));
      });

      await client.join(
        session.appId,
        session.channel,
        session.token || null,
        session.uid
      );
      if (clientRef.current !== client) return; // usuário encerrou durante o join

      const mic = await AgoraRTC.createMicrophoneAudioTrack();
      micRef.current = mic;
      await client.publish(mic);
      if (clientRef.current !== client) {
        mic.close();
        return;
      }
      setStatus("live");
    } catch (e) {
      await cleanup();
      setErrorMsg(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  async function disconnect() {
    await cleanup();
    setStatus("ended");
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-emerald-400">MODO VOZ · AGORA</p>
        {status === "live" && (
          <span className="flex items-center gap-2 font-mono text-xs text-emerald-300">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            {agentOn ? (mode === "coach" ? "COACH NO AR" : "BANCA NO AR") : "CONECTANDO…"}
          </span>
        )}
      </div>

      {(status === "idle" || status === "ended") && (
        <>
          <p className="mt-2 text-sm text-neutral-400">
            {status === "ended"
              ? "Sessão de voz encerrada — a de texto continua aqui embaixo."
              : mode === "coach"
                ? "Fala com teu coach por voz — ele lembra da tua carreira e executa o que tu mandar."
                : "Prefere falar? A banca te sabatina por áudio — mesmo prompt, mesmo veredito."}
          </p>
          <button
            onClick={connect}
            disabled={!profileEmail}
            className="mt-3 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-40"
          >
            {mode === "coach" ? "🎙 Falar com o coach" : "🎙 Sabatina por voz"}
          </button>
          {!profileEmail && (
            <p className="mt-1 text-xs text-neutral-500">
              (precisa do email salvo — volte e preencha pra usar voz)
            </p>
          )}
        </>
      )}

      {status === "connecting" && (
        <p className="mt-2 text-sm text-neutral-400">
          {mode === "coach" ? "Chamando o coach" : "Chamando a banca"}… libera o microfone quando o browser pedir.
        </p>
      )}

      {status === "live" && (
        <>
          <p className="mt-2 text-sm text-neutral-300">
            {mode === "coach" ? "Mic aberto — manda que o coach executa." : "Mic aberto — responde aí que a banca tá ouvindo."}
          </p>
          <button
            onClick={disconnect}
            className="mt-3 rounded-xl border border-red-800 bg-red-950/40 px-5 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-950"
          >
            Encerrar
          </button>
        </>
      )}

      {status === "error" && (
        <>
          <p className="mt-2 text-sm text-red-300">{errorMsg}</p>
          <button
            onClick={connect}
            className="mt-3 rounded-xl border border-neutral-700 px-5 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Tentar de novo
          </button>
        </>
      )}
    </div>
  );
}
