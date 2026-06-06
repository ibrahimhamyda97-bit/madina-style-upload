import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const REF_REGEX = /SAM-\d{3}DJ\d{3}/i;

const WELCOME: Msg = {
  role: "assistant",
  content:
    "Bonjour 👋 Je suis **Sama**, l'assistante Madina SBK. Posez-moi vos questions : suivi de commande, livraison, remboursement, paiement Orange Money / MTN… Pour suivre une commande précise, partagez son numéro au format **SAM-XXXDJXXX**.",
};

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setStreaming(true);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const reference = text.match(REF_REGEX)?.[0];

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/support-ai`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: next.map((m) => ({ role: m.role, content: m.content })),
            reference,
          }),
        },
      );

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({ error: "Erreur inconnue" }));
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: `Désolée, une erreur est survenue. ${errBody.error ?? ""}`,
          };
          return copy;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              acc += delta;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: acc };
                return copy;
              });
            }
          } catch {
            // ignore parse errors on partial chunks
          }
        }
      }
    } catch (e: any) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "Désolée, je n'ai pas pu joindre le service. Réessayez dans un instant.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Assistance Madina"
        className={cn(
          "fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full grid place-items-center shadow-elegant",
          "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
          "hover:scale-105 transition-transform"
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-8rem))]",
          "rounded-3xl bg-card border border-border shadow-elegant flex flex-col overflow-hidden",
          "transition-all duration-300 origin-bottom-right",
          open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
        )}
      >
        <div className="px-4 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary-foreground/15 grid place-items-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold leading-tight">Sama · Assistance Madina</p>
            <p className="text-[11px] opacity-80">En ligne · Réponse en quelques secondes</p>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
                m.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              )}
            >
              {m.content || (streaming && i === messages.length - 1 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null)}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="p-3 border-t border-border bg-card flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Écrivez votre message…"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="h-10 w-10 shrink-0 rounded-full bg-primary text-primary-foreground grid place-items-center disabled:opacity-50 hover:opacity-90"
            aria-label="Envoyer"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </>
  );
}
