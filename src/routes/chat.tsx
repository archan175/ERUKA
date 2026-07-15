import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  PaperPlaneRight,
  ChatCircleDots,
  Checks,
  Microphone,
  Image as ImageIcon,
  GlobeHemisphereWest,
  Spinner,
  Play,
  Pause,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchUserRooms,
  fetchMessages,
  subscribeToMessages,
  sendMessage,
  uploadChatMedia,
  markChatSeen,
  profileMatchesUser,
  type Room,
  type ChatMessage,
} from "@/lib/chat";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ChatSearch = {
  room?: string;
};

function getOtherParticipants(room: Room, user: ReturnType<typeof getCurrentUser>) {
  if (!user) return room.participants;
  return room.participants.filter((p) => !profileMatchesUser(p, user));
}

function getRoomDisplay(
  room: Room,
  user: ReturnType<typeof getCurrentUser>,
  authUid?: string | null,
) {
  const others = getOtherParticipants(room, user).filter(
    (p) => !authUid || p.id !== authUid,
  );
  const visibleParticipants = others.length > 0 ? others : room.participants;
  const name =
    visibleParticipants
      .map((p) => p?.name)
      .filter(Boolean)
      .join(", ") ||
    room.title ||
    "Private Room";
  return {
    name,
    role: others.length === 1 ? others[0]?.role || "Private" : "Private",
    initial: (name.trim()[0] || "R").toUpperCase(),
  };
}

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    room: typeof search.room === "string" ? search.room : undefined,
  }),
  beforeLoad: () => {
    if (!getCurrentUser()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Communications Hub — ERUKA" },
      { name: "description", content: "Chat globally and privately on ERUKA." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const search = Route.useSearch();
  const currentUser = getCurrentUser();

  // Track the actual Supabase auth UUID for correct message ownership checks
  const [authUid, setAuthUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setAuthUid(data.user.id);
    });
  }, []);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | "global">(search.room || "global");
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch rooms whenever auth UID is available
  useEffect(() => {
    const refreshRooms = () => {
      void fetchUserRooms().then((data) => setRooms(data));
    };
    refreshRooms();
    window.addEventListener("eruka:room-created", refreshRooms);
    window.addEventListener("eruka:bids-changed", refreshRooms);
    return () => {
      window.removeEventListener("eruka:room-created", refreshRooms);
      window.removeEventListener("eruka:bids-changed", refreshRooms);
    };
  }, [authUid]);

  useEffect(() => {
    if (search.room) setSelectedChat(search.room);
  }, [search.room]);

  // Fetch messages + realtime subscription whenever selected chat changes
  useEffect(() => {
    const roomId = selectedChat === "global" ? null : selectedChat;
    void fetchMessages(roomId).then((data) => setMessages(data));

    const unsubscribe = subscribeToMessages((newMsg) => {
      const isGlobalMsg = newMsg.room_id === null;
      const isRoomMsg = newMsg.room_id === selectedChat;
      if ((selectedChat === "global" && isGlobalMsg) || (selectedChat !== "global" && isRoomMsg)) {
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });
    return () => unsubscribe();
  }, [selectedChat, authUid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const uid = authUid || currentUser?.id;
    if (!uid) return;
    markChatSeen(uid);
  }, [messages.length, selectedChat, authUid, currentUser]);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    const q = searchQuery.toLowerCase();
    return rooms.filter((r) => {
      const d = getRoomDisplay(r, currentUser, authUid);
      return d.name.toLowerCase().includes(q) || r.title?.toLowerCase().includes(q);
    });
  }, [searchQuery, rooms, currentUser, authUid]);

  // Determine if a message was sent by the current user
  function isMine(msg: ChatMessage) {
    if (!currentUser) return false;
    // Primary: match by Supabase UUID
    if (authUid && msg.sender_id === authUid) return true;
    // Fallback: match by local user id or email
    if (msg.sender_id === currentUser.id) return true;
    if (msg.sender_id.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (msg.sender?.email?.toLowerCase() === currentUser.email.toLowerCase()) return true;
    return false;
  }

  const handleSend = async (e?: React.FormEvent, mediaFile?: File, type?: "image" | "voice") => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text && !mediaFile) return;

    setIsSending(true);
    try {
      let imageUrl: string | null = null;
      let voiceUrl: string | null = null;

      if (mediaFile && type) {
        const url = await uploadChatMedia(mediaFile, type);
        if (!url && !text) {
          toast.error(`Could not attach ${type === "image" ? "image" : "voice message"}`);
          return;
        }
        if (type === "image") imageUrl = url;
        if (type === "voice") voiceUrl = url;
      }

      const roomId = selectedChat === "global" ? null : selectedChat;
      const sent = await sendMessage({ text, roomId, imageUrl, voiceUrl });

      if (!sent) {
        toast.error("Could not send message. Please log in again.");
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setNewMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      inputRef.current?.focus();
    } finally {
      setIsSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        await handleSend(undefined, file, "voice");
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch {
      toast.error("Microphone access denied. Please allow microphone access.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const toggleAudio = (id: string, url: string) => {
    const audio = audioRefs.current[id] || new Audio(url);
    if (!audioRefs.current[id]) {
      audioRefs.current[id] = audio;
      audio.onended = () => setPlayingAudio(null);
    }
    if (playingAudio === id) {
      audio.pause();
      setPlayingAudio(null);
    } else {
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio].pause();
      }
      void audio.play();
      setPlayingAudio(id);
    }
  };

  const getChatName = () => {
    if (selectedChat === "global") return "Global Hub";
    const r = rooms.find((r) => r.id === selectedChat);
    if (!r) return "Private Chat";
    return getRoomDisplay(r, currentUser, authUid).name;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-wide uppercase">
            Communications Hub
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Eruka Network</p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        style={{ height: "calc(100vh - 16rem)" }}
      >
        {/* Sidebar */}
        <Card className="bg-card border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-muted">
            <Input
              placeholder="Search nodes..."
              className="bg-background border-border text-foreground focus-visible:ring-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2 space-y-1">
            {/* Global Hub button */}
            <button
              onClick={() => setSelectedChat("global")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                selectedChat === "global"
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted border border-transparent"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 shadow-lg ${
                  selectedChat === "global"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-foreground"
                }`}
              >
                <GlobeHemisphereWest weight="fill" className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className="text-sm font-bold text-foreground tracking-wide">Global Hub</span>
                <p className="text-xs text-primary animate-pulse">Public Channel</p>
              </div>
            </button>

            <div className="pt-4 pb-2 px-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Active Rooms
              </span>
            </div>

            {filteredRooms.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4 px-2">
                No private rooms yet. Accept a bid to start a private chat.
              </p>
            )}

            {filteredRooms.map((room) => {
              const display = getRoomDisplay(room, currentUser, authUid);
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedChat(room.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedChat === room.id
                      ? "bg-muted/50 border border-primary/20"
                      : "hover:bg-muted border border-transparent"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-foreground shrink-0 shadow-inner">
                    {display.initial}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-sm font-semibold text-foreground truncate block">
                      {display.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {display.role}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Chat Area */}
        <Card className="bg-background border-border lg:col-span-2 flex flex-col overflow-hidden relative shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border p-4 bg-card/80 backdrop-blur-md z-10">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ${
                selectedChat === "global"
                  ? "bg-primary text-primary-foreground"
                  : "bg-gray-800 text-foreground"
              }`}
            >
              {selectedChat === "global" ? (
                <GlobeHemisphereWest weight="fill" className="h-5 w-5" />
              ) : (
                <span className="font-bold text-sm">{getChatName().charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div>
              <p className="text-md font-bold text-foreground tracking-wide">{getChatName()}</p>
              <p className="text-[10px] text-primary uppercase tracking-widest font-bold">
                {selectedChat === "global" ? "All users · Live" : "Secure Connection"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 animate-fade-in">
                <ChatCircleDots weight="light" className="h-12 w-12 opacity-20" />
                <p className="text-sm tracking-wide text-center">
                  {selectedChat === "global"
                    ? "No messages yet. Be the first to say hello!"
                    : "No messages intercepted yet. Begin transmission."}
                </p>
              </div>
            )}
            {messages.map((msg) => {
              if (!msg) return null;
              const mine = isMine(msg);
              const senderName = msg.sender?.name || "ERUKA User";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${mine ? "items-end" : "items-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}
                >
                  {!mine && (
                    <span className="text-[11px] text-primary font-semibold mb-1 ml-1">
                      {senderName}
                    </span>
                  )}

                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-lg relative ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground border border-border rounded-bl-sm"
                    }`}
                  >
                    {/* Image */}
                    {msg.image_url && (
                      <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden">
                        <img
                          src={msg.image_url}
                          alt="Shared image"
                          className="w-full h-auto object-cover max-h-64 rounded-t-xl cursor-pointer"
                          onClick={() => window.open(msg.image_url!, "_blank")}
                        />
                      </div>
                    )}

                    {/* Voice message */}
                    {msg.voice_url && (
                      <div
                        className={`flex items-center gap-3 p-2 rounded-xl mb-2 ${mine ? "bg-black/10" : "bg-background/50"}`}
                      >
                        <button
                          onClick={() => toggleAudio(msg.id, msg.voice_url!)}
                          className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-md ${
                            mine
                              ? "bg-background text-primary"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {playingAudio === msg.id ? (
                            <Pause weight="fill" className="h-4 w-4" />
                          ) : (
                            <Play weight="fill" className="h-4 w-4 ml-0.5" />
                          )}
                        </button>
                        <div className="flex gap-[3px] items-center h-8 flex-1">
                          {Array.from({ length: 20 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1 rounded-full transition-all ${mine ? "bg-primary-foreground/60" : "bg-primary/50"} ${playingAudio === msg.id ? "animate-pulse" : ""}`}
                              style={{ height: `${30 + Math.sin(i * 0.8) * 20 + Math.random() * 15}%` }}
                            />
                          ))}
                        </div>
                        <span className={`text-[10px] shrink-0 ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                          Voice
                        </span>
                      </div>
                    )}

                    {/* Text */}
                    {msg.text && (
                      <p className="text-[14px] leading-relaxed">{msg.text}</p>
                    )}

                    {/* Timestamp */}
                    <div
                      className={`mt-1.5 flex items-center gap-1 justify-end text-[10px] ${
                        mine ? "text-primary-foreground/60" : "text-muted-foreground/60"
                      }`}
                    >
                      {(() => {
                        const d = new Date(msg.created_at);
                        return isNaN(d.getTime())
                          ? ""
                          : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      })()}
                      {mine && <Checks weight="bold" className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card border-t border-border">
            <form
              onSubmit={handleSend}
              className="flex items-center gap-3 bg-muted rounded-full px-2 py-1.5 border border-border shadow-inner focus-within:border-primary/50 transition-colors"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleSend(undefined, file, "image");
                }}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Attach image"
                className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <ImageIcon weight="fill" className="h-5 w-5" />
              </button>

              <input
                ref={inputRef}
                placeholder={isRecording ? "Recording..." : "Type a message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={isRecording || isSending}
                className="flex-1 bg-transparent border-none text-foreground focus:outline-none focus:ring-0 placeholder-muted-foreground text-sm px-2 disabled:opacity-50"
              />

              {newMessage.trim() ? (
                <Button
                  type="submit"
                  disabled={isSending}
                  className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 p-0 shadow-lg shadow-primary/20"
                >
                  {isSending ? (
                    <Spinner weight="bold" className="h-4 w-4 animate-spin" />
                  ) : (
                    <PaperPlaneRight weight="fill" className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <button
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  title={isRecording ? "Release to send" : "Hold to record voice"}
                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 transition-all shadow-lg ${
                    isRecording
                      ? "bg-red-500 text-white animate-pulse scale-110 shadow-red-500/40"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                  }`}
                >
                  {isSending ? (
                    <Spinner weight="bold" className="h-4 w-4 animate-spin" />
                  ) : (
                    <Microphone weight="fill" className="h-5 w-5" />
                  )}
                </button>
              )}
            </form>
            <p className="text-center text-[10px] text-foreground/30 mt-2 font-medium uppercase tracking-widest">
              {isRecording ? "Release to send voice message" : "Hold microphone to record voice"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
