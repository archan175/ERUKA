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

export function AIHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const currentUser = getCurrentUser();
  const STORAGE_KEY = currentUser ? `eruka_support_${currentUser.email}` : 'eruka_support_guest';
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [ { id: 'welcome', sender: 'support', text: 'Hi, I am ERUKA AI. Ask me anything about login, signup, jobs, or bids.' } ];
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
    
    const min = 2000;
    const max = 4000;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    setTypingLabel('ERUKA is typing');
    setIsTyping(true);

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
      replyTimersRef.current = replyTimersRef.current.filter((t) => t !== timer);
    }, delay) as unknown as number;

    replyTimersRef.current.push(timer);
  };

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {isOpen ? (
        <Card className="w-[22rem] border-white/10 bg-[#07111f] shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-white/5 p-3">
            <div className="flex items-center gap-2">
              <div className="rounded-md bg-[#19d7b5]/15 p-1.5">
                <Bot className="h-4 w-4 text-[#19d7b5]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">AI Assistant</p>
                <p className="text-xs text-[#19d7b5]">Instant replies</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => {
                clearPendingReplies();
                setIsOpen(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="space-y-3 p-3">
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-[#050b18] p-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                    message.sender === "user"
                      ? "ml-auto bg-[#19d7b5] text-[#050b18]"
                      : "bg-[#0b1528] text-white border border-white/5"
                  }`}
                >
                  {message.text}
                </div>
              ))}
              {isTyping && (
                <div className="max-w-[65%] rounded-lg px-3 py-2 text-xs bg-[#0b1528] text-white border border-white/5">
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
                  className="rounded-full border border-white/10 bg-[#050b18] px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-[#19d7b5]/50 hover:text-white"
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
                className="h-9 text-sm bg-[#050b18] border-white/10 text-white focus-visible:ring-[#19d7b5]/50"
              />
              <Button type="submit" size="icon" disabled={!canSend} className="bg-[#19d7b5] text-[#050b18] hover:bg-[#19d7b5]/80">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col items-center group">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-[#050b18] text-[#19d7b5] text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3 border border-[#19d7b5]/30 shadow-[0_5px_15px_rgba(25,215,181,0.2)] absolute -top-10 whitespace-nowrap">
            AI Assistant
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#050b18] border-b border-r border-[#19d7b5]/30 rotate-45"></div>
          </div>
          <Button
            type="button"
            className="h-12 w-12 rounded-full bg-[#0b1528] border border-white/10 text-white shadow-xl transition-transform hover:scale-105 hover:border-[#19d7b5]/50"
            onClick={() => {
              clearPendingReplies();
              setIsOpen(true);
            }}
            aria-label="Open help chat"
          >
            <Bot className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
