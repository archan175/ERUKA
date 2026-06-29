import { useMemo, useState, useRef, useEffect } from "react";
import { MessageCircle, Send, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateSmartReply } from "@/lib/reply";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";

type ChatMessage = {
  id: string;
  sender: "user" | "support";
  text: string;
};

const quickPrompts = [
  "I can't login",
  "How do I sign up?",
  "How to post a job?",
  "How to apply for jobs?",
];

function getSupportReply(message: string) {
  const msg = message.toLowerCase();

  return generateSmartReply(message);
}

export function SupportChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const currentUser = getCurrentUser();
  const STORAGE_KEY = currentUser ? `eruka_support_${currentUser.email}` : 'eruka_support_guest';
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [ { id: 'welcome', sender: 'support', text: 'Hi, I am ERUKA Support. Ask me anything about login, signup, jobs, or bids.' } ];
    try { return JSON.parse(raw) as ChatMessage[]; } catch { return []; }
  });

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const replyTimersRef = useRef<number[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [typingLabel, setTypingLabel] = useState<string>('ERUKA is typing');
  const messagesRef = useRef<ChatMessage[]>(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    return () => {
      // clear any pending reply timers on unmount
      replyTimersRef.current.forEach((t) => clearTimeout(t));
      replyTimersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  const clearPendingReplies = () => {
    replyTimersRef.current.forEach((t) => clearTimeout(t));
    replyTimersRef.current = [];
    setIsTyping(false);
  };

  const sendMessage = (text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const userMessage: ChatMessage = {
      id: `${Date.now()}-u`,
      sender: "user",
      text: cleanText,
    };

    setMessages((prev) => {
      const next = [...prev, userMessage];
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setInput("");
    // schedule a simulated support reply after a shorter 2-4s delay and ensure we include the new message in history
    const min = 2000;
    const max = 4000;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

  // always show ERUKA as the typing persona for live support
  setTypingLabel('ERUKA is typing');
  setIsTyping(true);

    // build history including the just-sent message using messagesRef to avoid stale closures
    const historyNow = [...messagesRef.current, userMessage].map((m) => m.text);

    const timer = window.setTimeout(async () => {
      const reply = generateSmartReply(cleanText, { role: currentUser?.role, history: historyNow });
      const supportMessage: ChatMessage = {
        id: `${Date.now()}-s`,
        sender: "support",
        text: reply,
      };

      setMessages((prev) => {
        const next = [...prev, supportMessage];
        if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
      setIsTyping(false);
      // remove this timer from the ref
      replyTimersRef.current = replyTimersRef.current.filter((t) => t !== timer);
    }, delay) as unknown as number;

    replyTimersRef.current.push(timer);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <Card className="w-[22rem] border-border/60 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border/50 p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-primary/15 p-1.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Help Bot</p>
                <p className="text-xs text-success">Instant replies</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                clearPendingReplies();
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="space-y-3 p-3">
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-muted/30 p-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    message.sender === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-card text-foreground border border-border/50"
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {isTyping && (
                <div className="max-w-[65%] rounded-lg px-3 py-2 text-xs bg-card/80 text-foreground border border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-75" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse delay-150" />
                    <div className="ml-2 text-[11px] text-muted-foreground">{typingLabel}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                sendMessage(input);
              }}
            >
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Describe your issue..."
                className="h-9 text-sm"
              />
              <Button type="submit" size="icon" variant="hero" disabled={!canSend}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button
          type="button"
          variant="hero"
          className="h-12 w-12 rounded-full shadow-xl"
          onClick={() => {
            // clear any old timers when re-opening to avoid duplicate replies
            clearPendingReplies();
            setIsOpen(true);
          }}
          aria-label="Open help chat"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}
