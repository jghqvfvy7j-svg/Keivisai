"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Dumbbell, Apple, Moon, TrendingUp, ImagePlus, X, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoachConsentPrompt } from "@/components/coach/coach-consent-prompt";
import { VoiceButton, canRecordAudio } from "@/components/coach/voice-button";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; image?: string };

const SUGGESTIONS = [
  { icon: Dumbbell, text: "Build me a 4-day push/pull/legs split" },
  { icon: TrendingUp, text: "My bench press has stalled at 60kg. What now?" },
  { icon: Apple, text: "How much protein should I eat per day?" },
  { icon: Moon, text: "How do I know if I need a rest day?" },
];

export function CoachChat({
  coachName,
  initialMessages,
  initialConversationId,
}: {
  coachName: string;
  initialMessages: Msg[];
  initialConversationId: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // A photo waiting to be sent. `path` is its place in storage (sent to the
  // coach); `url` is a signed URL for the thumbnail, which survives a reload
  // unlike a blob: URL. `uploading` shows a spinner while it saves.
  const [pendingImage, setPendingImage] = useState<{
    path: string;
    url: string;
    mediaType: string;
  } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  function clearImage() {
    setPendingImage(null);
  }

  async function attachImage(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      toast.error("Use a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("That image is too big (max 5MB).");
      return;
    }
    setUploadingImage(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch("/api/coach/photo", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.path || !data.url) {
        toast.error(data.error ?? "Couldn't attach that photo.");
        return;
      }
      setPendingImage({ path: data.path, url: data.url, mediaType: data.mediaType });
    } catch {
      toast.error("Couldn't attach that photo. Try again.");
    } finally {
      setUploadingImage(false);
    }
  }

  // Only show the mic if this browser can actually record. Lazy initial value so
  // there's no setState-in-effect; on the server it's false, then hydrates.
  const [showMic, setShowMic] = useState(false);
  useEffect(() => {
    if (canRecordAudio()) setShowMic(true);
  }, []);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(initialConversationId);
  const endRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const jumpToBottom = (smooth = false) =>
    endRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });

  // On first open, jump straight to the latest message (instant, no rewind).
  // Retry across a frame and a short delay so late-loading photos can't leave
  // the view stuck near the top.
  useEffect(() => {
    jumpToBottom(false);
    const r = requestAnimationFrame(() => jumpToBottom(false));
    const t = setTimeout(() => jumpToBottom(false), 300);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After that, follow new messages / the typing dots to the bottom, smoothly.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    jumpToBottom(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  // Show a "jump to latest" arrow when the user has scrolled up from the bottom.
  useEffect(() => {
    const onScroll = () => {
      const gap =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
      setShowScrollDown(gap > 320);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    // Allow sending with only an image (e.g. "is this recipe any good?").
    if ((!content && !pendingImage) || loading) return;

    const image = pendingImage;
    clearImage();

    // What we show in the thread: the text (may be empty for a photo-only
    // message) plus the thumbnail. No placeholder text — the image speaks for
    // itself, and this matches how the message looks after a reload.
    const shownMsg: Msg = {
      role: "user",
      content,
      image: image?.url,
    };
    setMessages((m) => [...m, shownMsg]);
    setInput("");
    setLoading(true);

    // What we send to Claude: a plain string, or a text + image-reference array.
    // The image travels as its storage path, not megabytes of base64.
    const outgoingContent = image
      ? [
          ...(content
            ? [{ type: "text", text: content }]
            : [{ type: "text", text: "What do you think of this?" }]),
          { type: "image", storagePath: image.path, mediaType: image.mediaType },
        ]
      : content;

    // History for the model: prior turns as text, then this turn (maybe w/ image).
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const outgoing = [...history, { role: "user" as const, content: outgoingContent }];

    // Placeholder the streamed words will fill in.
    setMessages((m) => [...m, { role: "assistant", content: "" }]);
    const replaceLast = (content: string) =>
      setMessages((m) => [...m.slice(0, -1), { role: "assistant" as const, content }]);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: outgoing, conversationId, tzOffset: -new Date().getTimezoneOffset() }),
      });

      // The daily/burst limit and other early exits still answer with plain JSON.
      const contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("x-ndjson")) {
        const data = await res.json();
        replaceLast(data.reply ?? "…");
        if (data.limitReached) toast(data.reply, { duration: 6000 });
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let shown = "";
      let sawFirstToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // One JSON object per line; the last piece may be incomplete.
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: Record<string, unknown>;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }

          if (evt.t === "chunk") {
            if (!sawFirstToken) {
              sawFirstToken = true;
              setLoading(false); // the typing dots gave way to real words
            }
            shown += String(evt.v ?? "");
            replaceLast(shown);
          } else if (evt.t === "status" && evt.v === "building_routine") {
            replaceLast(shown + (shown ? "\n\n" : "") + "Building your plan…");
          } else if (evt.t === "done") {
            // The cleaned text is authoritative: swap it in.
            replaceLast(String(evt.reply ?? shown));
            if (evt.conversationId) setConversationId(String(evt.conversationId));
            if (evt.routineSaved) toast.success("New plan saved. Check the Train tab. 💪");
            if (evt.nutritionSet) {
              const n = evt.nutritionSet as { calories: number };
              toast.success(`Targets set: ${n.calories} kcal/day. See the Nutrition tab. 🍎`);
            }
            const remaining = evt.aiRemaining;
            if (typeof remaining === "number" && remaining <= 3 && remaining > 0) {
              toast(`${remaining} AI message${remaining === 1 ? "" : "s"} left today.`);
            }
          } else if (evt.t === "error") {
            replaceLast(String(evt.reply ?? "Something went wrong."));
          }
        }
      }
    } catch {
      // If the assistant already showed something, keep it; only clean up when
      // the turn produced nothing at all.
      setMessages((m) => {
        const last = m[m.length - 1];
        if (last && last.role === "assistant" && last.content === "") {
          // Never got a reply: drop the empty placeholder, keep the user's message.
          toast.error("Couldn't reach the coach. Try again.");
          return m.slice(0, -1);
        }
        return m;
      });
    } finally {
      setLoading(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      {/* Header */}
      <div className="animate-fade-up pt-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-volt/15 text-volt">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold">{coachName}</h1>
            <p className="text-xs text-muted">Your training, nutrition &amp; recovery coach</p>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="mt-6 flex-1 space-y-4">
        {empty && (
          <div className="animate-fade-up delay-1">
            <p className="text-sm text-muted">
              Hi, I&apos;m {coachName}. Ask me anything about training, nutrition or
              recovery. I know your goal and schedule, so answers are personalized.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s.text)}
                  className={cn(
                    "pressable liftable flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-left",
                    `animate-fade-up delay-${i + 1}`
                  )}
                >
                  <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-volt" />
                  <span className="text-sm">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => {
          const isUser = m.role === "user";
          const hasText = m.content.trim().length > 0;
          return (
            <div
              key={i}
              className={cn("animate-fade-up flex flex-col gap-1", isUser ? "items-end" : "items-start")}
            >
              {m.image && (
                <img
                  src={m.image}
                  alt="Photo"
                  className="max-h-60 max-w-[85%] rounded-2xl object-cover"
                />
              )}
              {hasText && (
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed",
                    isUser
                      ? "rounded-br-lg bg-volt text-volt-foreground"
                      : "rounded-bl-lg border border-border bg-surface"
                  )}
                >
                  {m.content}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-border bg-surface px-4 py-3.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Jump-to-latest arrow, shown when scrolled up. Sits above the composer. */}
      {showScrollDown && (
        <button
          onClick={() => jumpToBottom(true)}
          aria-label="Jump to latest"
          className="pressable glass fixed bottom-40 right-5 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-border shadow-lg lg:bottom-24"
        >
          <ChevronDown className="h-5 w-5 text-foreground" />
        </button>
      )}

      {/* Bottom stack: the one-time memory prompt sits directly on top of the
          composer, so it appears at the bottom of the screen where the user is
          already looking, not up at the top of the thread. */}
      <div className="sticky bottom-24 z-10 mt-4 flex flex-col gap-3 lg:bottom-4">
        <CoachConsentPrompt coachName={coachName} />

        {/* Composer: attachment preview on top, one tidy row of controls below,
            like Claude's own chat box. Nothing floats loose. */}
        <div className="glass rounded-3xl p-2">
          {(pendingImage || uploadingImage) && (
            <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface-2 p-2">
              {uploadingImage ? (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-surface">
                  <Loader2 className="h-5 w-5 animate-spin text-muted" />
                </div>
              ) : (
                <img src={pendingImage!.url} alt="Attached" className="h-14 w-14 rounded-xl object-cover" />
              )}
              <span className="flex-1 truncate text-xs text-muted">
                {uploadingImage ? "Uploading…" : "Photo attached"}
              </span>
              {!uploadingImage && (
                <button
                  onClick={clearImage}
                  aria-label="Remove photo"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void attachImage(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading || uploadingImage}
              aria-label="Attach a photo"
              className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-muted disabled:opacity-40"
            >
              <ImagePlus className="h-4 w-4" />
            </button>

            {showMic && (
              <VoiceButton
                disabled={loading}
                onTranscript={(text) => {
                  setInput((prev) => (prev ? prev.trimEnd() + " " + text : text));
                  inputRef.current?.focus();
                }}
              />
            )}

            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
              placeholder={pendingImage ? "Add a note…" : `Ask ${coachName}…`}
              type="text"
              enterKeyHint="send"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
              autoComplete="off"
              className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-2"
            />

            <button
              onClick={() => send(input)}
              disabled={(!input.trim() && !pendingImage) || loading || uploadingImage}
              className="pressable flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-volt text-volt-foreground disabled:opacity-30"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <p className="mt-3 pb-2 text-center text-[11px] leading-relaxed text-muted-2">
        {coachName} gives general fitness guidance, not medical advice.
        <br />
        Your conversation is encrypted and private to your account.
      </p>
    </div>
  );
}
