import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askTravelAssistant } from "@/lib/ai.functions";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageSquare, Sparkles, Mic, MicOff } from "lucide-react";
import { toast } from "sonner";
import { FormattedText } from "@/components/formatted-text";

export const Route = createFileRoute("/_authenticated/app/chat")({
  component: ChatPage,
});

type Msg = { role: "user" | "ai"; content: string };

const PROMPTS = [
  "I'm bored — what now?",
  "I have ₹500 and 3 hours",
  "Is Marina Beach crowded right now?",
  "Best time to visit Hampi to avoid crowds",
  "Monsoon survival tips for Kerala",
  "Solo female travel safety in Delhi",
  "Cheap street food under ₹100",
  "Rainy day — indoor spots nearby",
  "Avoid tourist scams in Jaipur",
  "Altitude sickness tips for Leh",
];

function ChatPage() {
  const ask = useServerFn(askTravelAssistant);
  const [city, setCity] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      content:
        "Namaste 👋 I'm PRISM — your travel AI for India. Ask me anything: hidden gems, crowd levels, weather swaps, budget hacks, safety, survival, scams, street food, itineraries. What's on your mind?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<unknown>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("current_city")
        .eq("id", u.user.id)
        .maybeSingle();
      if (data?.current_city) setCity(data.current_city);
    })();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  function toggleVoice() {
    type Recog = {
      start: () => void;
      stop: () => void;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
      onerror: (e: unknown) => void;
      lang: string;
      interimResults: boolean;
      continuous: boolean;
    };
    type W = Window & {
      webkitSpeechRecognition?: new () => Recog;
      SpeechRecognition?: new () => Recog;
    };
    const w = window as W;
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return toast.error("Voice not supported — try Chrome / Edge on Android or desktop.");
    if (!window.isSecureContext)
      return toast.error("Mic needs HTTPS. Open the published app or use a secure URL.");
    if (listening && recogRef.current) {
      (recogRef.current as Recog).stop();
      return;
    }
    // Pre-request permission so Safari/Chrome show the prompt reliably.
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        const name = (err as { name?: string })?.name ?? "";
        if (name === "NotAllowedError")
          return toast.error("Mic blocked. Enable it in browser site settings.");
        if (name === "NotFoundError") return toast.error("No microphone found on this device.");
        return toast.error("Mic unavailable — check permissions.");
      }
      const r = new Ctor();
      r.lang = "en-IN";
      r.interimResults = false;
      r.continuous = false;
      r.onresult = (e) => {
        const t = e.results[0][0].transcript;
        setInput(t);
        void send(t);
      };
      r.onend = () => setListening(false);
      r.onerror = (ev: unknown) => {
        setListening(false);
        const err = (ev as { error?: string })?.error;
        if (err === "not-allowed" || err === "service-not-allowed")
          toast.error("Mic permission denied.");
        else if (err === "no-speech") toast.error("Didn't catch that — try again.");
        else if (err === "audio-capture") toast.error("No mic detected.");
        else if (err === "network") toast.error("Voice needs internet. Retry.");
        else toast.error(`Mic error${err ? `: ${err}` : ""}`);
      };
      recogRef.current = r;
      setListening(true);
      try {
        r.start();
      } catch {
        setListening(false);
        toast.error("Couldn't start mic — reload and try again.");
      }
    })();
  }

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const res = (await ask({ data: { message, context_city: city || undefined } })) as {
        reply: string;
      };
      setMsgs((m) => [...m, { role: "ai", content: res.reply }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Travel Chat">
      <div className="flex h-[calc(100vh-12rem)] flex-col gap-3">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
          <MessageSquare className="h-4 w-4 text-primary" />
          <Input
            placeholder="City context (e.g. Chennai)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card/40 p-4">
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "text-primary-foreground" : "bg-muted text-foreground"}`}
                style={m.role === "user" ? { background: "var(--gradient-warm)" } : undefined}
              >
                <FormattedText text={m.content} />
              </div>
            </div>
          ))}
          {loading && (
            <div className="text-xs text-muted-foreground">
              <Sparkles className="mr-1 inline h-3 w-3 animate-pulse text-primary" /> PRISM is
              thinking…
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => send(p)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <Input
            placeholder="Ask PRISM anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button
            type="button"
            variant={listening ? "default" : "outline"}
            onClick={toggleVoice}
            disabled={loading}
            aria-label="Voice"
          >
            {listening ? <MicOff className="h-4 w-4 animate-pulse" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button type="submit" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </AppShell>
  );
}
