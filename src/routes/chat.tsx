import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle, CheckCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { fetchMessagesForUser } from "@/lib/local-data";
import { generateSmartReply } from "@/lib/reply";

type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt?: string;
};

const conversations = [
  { id: "c1", name: "Aastha", avatar: "A", lastMessage: "Can you start next week?", time: "2m ago", unread: 2 },
  { id: "c2", name: "Archan Patel", avatar: "AP", lastMessage: "Thanks for the feedback!", time: "1h ago", unread: 0 },
  { id: "c3", name: "Zeel Patel", avatar: "ZP", lastMessage: "I've updated the designs.", time: "3h ago", unread: 0 },
  { id: "c4", name: "Aryan Patel", avatar: "AP", lastMessage: "Please update milestone 2.", time: "Yesterday", unread: 0 },
];

export const Route = createFileRoute("/chat")({
  beforeLoad: () => {
    if (!getCurrentUser()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Chat — ERUKA" },
      { name: "description", content: "Chat with freelancers and recruiters on ERUKA." },
    ],
  }),
  component: ChatPage,
});

// ---------------------------------------------------------------------------
// Helpers for per-conversation localStorage persistence
// ---------------------------------------------------------------------------
function chatStorageKey(conversationId: string, userEmail: string) {
  return `eruka_chat_${conversationId}_${userEmail}`;
}

function loadLocalMessages(conversationId: string, userEmail: string): ChatMessage[] {
  try {
    const raw = window.localStorage.getItem(chatStorageKey(conversationId, userEmail));
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

function persistLocalMessages(conversationId: string, userEmail: string, msgs: ChatMessage[]) {
  try {
    window.localStorage.setItem(chatStorageKey(conversationId, userEmail), JSON.stringify(msgs));
  } catch {
    // localStorage full – silently ignore
  }
}

// ---------------------------------------------------------------------------
// ChatPage component
// ---------------------------------------------------------------------------
function ChatPage() {
  const [selectedChat, setSelectedChat] = useState("c1");
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchedMessages, setFetchedMessages] = useState<ChatMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const currentUser = getCurrentUser();
  const userId = currentUser?.id || currentUser?.email || "";
  const userEmail = currentUser?.email || "";

  // Ref for timer cleanup
  const replyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // ---------------------------------------------------------------------------
  // Fetch server/bid-acceptance messages
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!currentUser) return;
    void fetchMessagesForUser(userId).then((res) => {
      setFetchedMessages(res as ChatMessage[]);
    });

    const onInserted = () => {
      void fetchMessagesForUser(userId).then((res) => setFetchedMessages(res as ChatMessage[]));
    };
    window.addEventListener("eruka:message-inserted", onInserted);
    return () => window.removeEventListener("eruka:message-inserted", onInserted);
  }, [currentUser, userId]);

  // ---------------------------------------------------------------------------
  // Load local messages when selected conversation changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!userEmail) return;
    setLocalMessages(loadLocalMessages(selectedChat, userEmail));
  }, [selectedChat, userEmail]);

  // ---------------------------------------------------------------------------
  // Cleanup reply timer on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (replyTimerRef.current) clearTimeout(replyTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Auto-scroll to bottom when messages change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages, fetchedMessages, isTyping]);

  // ---------------------------------------------------------------------------
  // Merged messages = fetched + local, sorted by time
  // ---------------------------------------------------------------------------
  const allMessages = useMemo(() => {
    const seenIds = new Set<string>();
    const merged: ChatMessage[] = [];
    for (const msg of [...fetchedMessages, ...localMessages]) {
      if (!seenIds.has(msg.id)) {
        seenIds.add(msg.id);
        merged.push(msg);
      }
    }
    merged.sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return ta - tb;
    });
    return merged;
  }, [fetchedMessages, localMessages]);

  // ---------------------------------------------------------------------------
  // Filtered conversations list based on search query
  // ---------------------------------------------------------------------------
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((conv) => conv.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const activeConversation = conversations.find((conv) => conv.id === selectedChat) || conversations[0];

  // ---------------------------------------------------------------------------
  // Submit handler
  // ---------------------------------------------------------------------------
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !currentUser) return;

    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      senderId: userId,
      receiverId: selectedChat,
      text,
      createdAt: now,
    };

    const updatedMessages = [...localMessages, userMsg];
    setLocalMessages(updatedMessages);
    persistLocalMessages(selectedChat, userEmail, updatedMessages);
    setNewMessage("");

    // --- Simulated reply ---
    setIsTyping(true);
    const delay = 2000 + Math.random() * 2000; // 2-4 seconds

    replyTimerRef.current = setTimeout(() => {
      setIsTyping(false);

      const replyText = generateSmartReply(text, {
        role: currentUser.role,
        history: updatedMessages.filter((m) => m.senderId === userId).map((m) => m.text),
      });

      const replyMsg: ChatMessage = {
        id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        senderId: selectedChat,
        receiverId: userId,
        text: replyText,
        createdAt: new Date().toISOString(),
      };

      setLocalMessages((prev) => {
        const next = [...prev, replyMsg];
        persistLocalMessages(selectedChat, userEmail, next);
        return next;
      });
    }, delay);
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" style={{ height: "calc(100vh - 16rem)" }}>
        {/* Conversations List */}
        <Card className="gradient-card border-border/50 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4 border-b border-border/50">
              <Input
                placeholder="Search conversations..."
                className="bg-input/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="divide-y divide-border/30">
              {filteredConversations.length === 0 && (
                <p className="p-4 text-sm text-muted-foreground text-center">No conversations found.</p>
              )}
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedChat(conv.id)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                    selectedChat === conv.id ? "bg-accent/50" : "hover:bg-accent/30"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary shrink-0">
                    {conv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{conv.name}</span>
                      <span className="text-[10px] text-muted-foreground">{conv.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                  </div>
                  {conv.unread > 0 && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {conv.unread}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="gradient-card border-border/50 lg:col-span-2 flex flex-col overflow-hidden">
          {/* Chat header */}
          <div className="flex items-center gap-3 border-b border-border/50 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
              {activeConversation.avatar}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{activeConversation.name}</p>
              <p className="text-[10px] text-success">Online</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {allMessages.length === 0 && !isTyping && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <MessageCircle className="h-10 w-10 opacity-40" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            )}
            {allMessages.map((msg) => {
              const isMine = msg.senderId === userId;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-accent text-accent-foreground rounded-bl-sm"
                    }`}
                  >
                    <p className="text-sm">{msg.text}</p>
                    <p
                      className={`mt-1 text-[10px] ${
                        isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {msg.createdAt
                        ? new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                      {isMine && <CheckCheck className="inline-block ml-1 h-3 w-3 text-primary-foreground/80" />}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-accent text-accent-foreground rounded-2xl rounded-bl-sm px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border/50 p-4">
            <form className="flex gap-2" onSubmit={handleSubmit}>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="bg-input/50"
              />
              <Button variant="hero" size="icon" type="submit">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
