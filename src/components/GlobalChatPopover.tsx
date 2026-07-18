import { useState, useRef, useEffect } from "react";
import { Send, Globe, Mic, Image as ImageIcon, Loader2, Play, Pause, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchMessages,
  sendMessage,
  subscribeToMessages,
  uploadChatMedia,
  getGlobalConversationId,
  getMessageSenderName,
  type ChatMessage,
} from "@/lib/chat";
import { toast } from "sonner";

function messageBelongsToCurrentUser(
  message: ChatMessage,
  user: ReturnType<typeof getCurrentUser>,
) {
  if (!user) return false;
  const senderEmail = message.sender?.email?.toLowerCase();
  const userEmail = user.email.toLowerCase();

  return (
    message.sender_id === user.id ||
    message.sender_id.toLowerCase() === userEmail ||
    senderEmail === userEmail
  );
}

export function GlobalChatPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [globalConvId, setGlobalConvId] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<{ [key:string]: HTMLAudioElement }>({});

  const currentUser = getCurrentUser();
  const popoverRef = useRef<HTMLDivElement>(null);

  // Resolve global conversation ID
  useEffect(() => {
    console.log("[ChatPopover] Initializing: getting global conversation ID.");
    getGlobalConversationId()
      .then((id) => {
        if (id) {
          console.log("[ChatPopover] Global conversation ID resolved:", id);
          setGlobalConvId(id);
        } else {
          console.error("[ChatPopover] Failed to resolve global conversation ID.");
          setError("Could not connect to the global chat room.");
        }
      })
      .catch((err) => {
        console.error("[ChatPopover] Error getting global conversation ID:", err);
        setError("An unexpected error occurred while setting up chat.");
      });
  }, []);

  useEffect(() => {
    if (!isOpen || !globalConvId) {
        if (isOpen) console.log('[ChatPopover] Effect skipped: chat open but no globalConvId yet.');
        return;
    };

    console.log("[ChatPopover] Chat opened or globalConvId changed. Fetching messages.");
    setIsLoading(true);
    setError(null);

    fetchMessages(globalConvId)
      .then((data) => {
        console.log(`[ChatPopover] Fetched ${data.length} initial messages.`);
        setMessages(data);
      })
      .catch((err) => {
        console.error("[ChatPopover] Error fetching messages:", err);
        setError("Failed to load message history.");
      })
      .finally(() => {
        setIsLoading(false);
        setInitialLoad(false);
      });

    console.log("[ChatPopover] Subscribing to new messages.");
    const unsubscribe = subscribeToMessages(globalConvId, (newMsg) => {
      console.log("[ChatPopover] Received new message via subscription:", newMsg.id);
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });

    return () => {
      console.log("[ChatPopover] Cleaning up: unsubscribing from messages.");
      unsubscribe();
    };
  }, [isOpen, globalConvId]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSend = async (e?: React.FormEvent, mediaFile?: File, type?: "image" | "voice") => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    const text = input.trim();
    if (!text && !mediaFile) return;

    setIsSending(true);
    try {
      const conversationId = globalConvId; // Already resolved
      if (!conversationId) {
        toast.error("Global chat is not ready yet. Please try again.");
        console.error("[ChatPopover] handleSend failed: no conversationId.");
        return;
      }

      let imageUrl = null;
      let voiceUrl = null;

      if (mediaFile && type) {
        const url = await uploadChatMedia(mediaFile, type);
        if (!url && !text) {
          toast.error(`Could not attach ${type === "image" ? "image" : "voice message"}`);
          return;
        }
        if (type === "image") imageUrl = url;
        if (type === "voice") voiceUrl = url;
      }

      const sentMessage = await sendMessage({
        text,
        conversationId,
        imageUrl,
        voiceUrl,
      });

      if (!sentMessage) {
        toast.error("Could not send message. Please log in again.");
        setError("Your message could not be sent. You may need to sign in again.");
        return;
      }

      setMessages((prev) => {
        if (prev.some((message) => message.id === sentMessage.id)) return prev;
        return [...prev, sentMessage];
      });
      setInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
        console.error("[ChatPopover] Error in handleSend:", err);
        setError(err instanceof Error ? err.message : "An unknown error occurred while sending.");
        toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };


  const startRecording = async () => {
    if (!currentUser) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "voice.webm", { type: "audio/webm" });
        await handleSend(undefined, file, "voice");
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
      toast.error("Microphone access denied. Please enable it in your browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
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
      audio.play();
      setPlayingAudio(id);
    }
  };

  if (!currentUser) return null;

  const renderContent = () => {
    if (initialLoad && isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Connecting to Global Chat...</p>
        </div>
      );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-destructive-foreground/70 gap-3 text-center p-4">
                <AlertTriangle className="h-8 w-8 opacity-50"/>
                <p className="text-sm font-semibold">Something went wrong</p>
                <p className="text-xs bg-destructive/20 p-2 rounded-md">
                    <strong>Error:</strong> {error}
                </p>
                <Button variant="outline" size="sm" onClick={() => setIsOpen(false) }>Close</Button>
            </div>
        );
    }

    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-2">
          <Globe className="h-8 w-8 opacity-20" />
          <p className="text-xs">No messages yet. Join the network!</p>
        </div>
      );
    }

    return messages.map((msg) => {
      const isMine = messageBelongsToCurrentUser(msg, currentUser);
      const senderName = getMessageSenderName(msg);
      return (
        <div
          key={msg.id}
          className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
        >
          {/* Avatar */}
          {!isMine && (
            <div className="shrink-0">
              {msg.sender?.avatar_url ? (
                <img
                  src={msg.sender.avatar_url}
                  alt={senderName}
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-border/50"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[10px] font-bold ring-1 ring-border/50">
                  {(senderName[0] || "U").toUpperCase()}
                </div>
              )}
            </div>
          )}

          <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
            {!isMine && (
              <span className="text-[10px] text-muted-foreground mb-1 ml-1 font-semibold">
                {senderName}
              </span>
            )}

            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm border ${
                isMine
                  ? "bg-primary text-primary-foreground border-transparent rounded-br-sm"
                  : "bg-card text-foreground border-border/50 rounded-bl-sm"
              }`}
            >
              {msg.image_url && (
                <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden bg-black/20">
                  <img
                    src={msg.image_url}
                    alt="Shared"
                    className="w-full h-auto object-cover max-h-40 rounded-t-xl"
                  />
                </div>
              )}

              {msg.voice_url && (
                <div
                  className={`flex items-center gap-2 p-1 rounded-xl mb-1 ${isMine ? "bg-black/10" : "bg-muted"}`}
                >
                  <button
                    onClick={() => toggleAudio(msg.id, msg.voice_url!)}
                    className={`h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${
                      isMine
                        ? "bg-primary-foreground text-primary"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {playingAudio === msg.id ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3 ml-0.5" />
                    )}
                  </button>
                  <div className="flex-1 h-1.5 bg-black/20 rounded-full overflow-hidden w-24">
                    <div
                      className={`h-full ${isMine ? "bg-primary-foreground/40" : "bg-primary/40"} ${playingAudio === msg.id ? "w-full transition-all duration-[3000ms] ease-linear" : "w-0"}`}
                    ></div>
                  </div>
                </div>
              )}

              {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
              <div
                className={`mt-1 flex items-center justify-end gap-1 text-[9px] font-bold ${
                  isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {(() => {
                  const d = new Date(msg.created_at);
                  return isNaN(d.getTime())
                    ? ""
                    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                })()}
              </div>
            </div>
          </div>
        </div>
      );
    });
  }


  return (
    <div className="relative" ref={popoverRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative ${isOpen ? "bg-muted" : ""}`}
      >
        <Globe className="h-5 w-5 text-[#19d7b5]" />
        <span className="hidden lg:inline ml-2 font-bold text-foreground">Global</span>
        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-[110%] w-[20rem] h-[28rem] sm:w-[24rem] sm:h-[32rem] flex flex-col bg-background/95 backdrop-blur-3xl border-border/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden animate-in fade-in slide-in-from-top-2 z-[100]">
          <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2 border border-primary/20">
                <Globe className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Global Chat</p>
                <p className="text-[10px] text-primary uppercase tracking-widest font-semibold animate-pulse">
                  Live Network
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-muted"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-muted/10">
            {renderContent()}
            <div ref={messagesEndRef} />
          </CardContent>

         {!(initialLoad && isLoading) && !error && (
            <div className="p-3 bg-card border-t border-border/50">
                <form
                onSubmit={handleSend}
                className="flex items-center gap-2 bg-muted/50 rounded-full p-1 border border-border focus-within:border-primary/50 transition-colors"
                >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleSend(undefined, file, "image");
                    }}
                />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                >
                    <ImageIcon className="h-4 w-4" />
                </button>

                <input
                    placeholder={isRecording ? "Recording..." : "Message global..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                    }
                    }}
                    disabled={isRecording || isSending}
                    className="flex-1 bg-transparent border-none text-foreground focus:outline-none focus:ring-0 placeholder-muted-foreground text-xs px-1 disabled:opacity-50"
                />

                {input.trim() ? (
                    <Button
                    type="submit"
                    disabled={isSending}
                    className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 p-0 shadow-sm"
                    >
                    {isSending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Send className="h-3 w-3 -ml-0.5" />
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
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm ${isRecording ? "bg-red-500 text-white animate-pulse scale-110" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                    >
                    {isSending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Mic className="h-3 w-3" />
                    )}
                    </button>
                )}
                </form>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
