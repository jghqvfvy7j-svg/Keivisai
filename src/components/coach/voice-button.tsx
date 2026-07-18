"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { toast } from "sonner";

type State = "idle" | "recording" | "transcribing";

/**
 * Records a short voice note, sends it to our transcribe endpoint, and hands the
 * text back so the composer can show it for review before sending. Nothing is
 * auto-sent: the user always sees the words first.
 *
 * The button only renders if the browser can record at all; on anything that
 * can't, the parent simply shows no mic, rather than a dead button.
 */
export function VoiceButton({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      // Let the browser pick a format it actually supports; Safari and Chrome
      // differ. The server accepts webm, mp4 and friends.
      const mime = pickMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => void handleStop(mime);
      rec.start();
      setState("recording");
    } catch {
      toast.error("I need microphone access for that. Check your browser settings.");
      cleanup();
    }
  }

  function stop() {
    // Triggers onstop, which does the upload.
    recorderRef.current?.stop();
    setState("transcribing");
  }

  async function handleStop(mime: string) {
    releaseMic();
    const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });

    // A tap that's too short to be speech: bail without a wasted request.
    if (blob.size < 1200) {
      setState("idle");
      return;
    }

    try {
      const form = new FormData();
      form.append("audio", blob, "voice.webm");
      const res = await fetch("/api/coach/transcribe", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // Be specific: a 503 usually means voice isn't set up yet, not a network
        // blip. A vague "connection issue" sent people chasing the wrong thing.
        if (res.status === 503) {
          toast.error("Voice input isn't set up yet.");
        } else if (res.status === 401) {
          toast.error("Please sign in again to use voice.");
        } else {
          toast.error(data.error ?? "Couldn't transcribe that. Try again.");
        }
      } else if (data.text) {
        // Hand it to the composer for review; do NOT send.
        onTranscript(data.text);
      }
    } catch {
      toast.error("Couldn't reach the server. Check your connection.");
    } finally {
      setState("idle");
    }
  }

  function releaseMic() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }
  function cleanup() {
    releaseMic();
    setState("idle");
  }

  const busy = state === "transcribing";
  const recording = state === "recording";

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      disabled={disabled || busy}
      aria-label={recording ? "Stop recording" : "Record a voice note"}
      className={
        "pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors disabled:opacity-40 " +
        (recording ? "bg-danger text-white" : "bg-surface-2 text-muted")
      }
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <Square className="h-4 w-4" fill="currentColor" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </button>
  );
}

/** True if this browser can record audio at all. */
export function canRecordAudio(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window !== "undefined" &&
    "MediaRecorder" in window
  );
}

/** First recording format the browser admits to supporting. */
function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const options = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const o of options) {
    if (MediaRecorder.isTypeSupported(o)) return o;
  }
  return "";
}
