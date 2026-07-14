import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperPlaneRight, ChatCircleDots, Checks, Microphone, Image as ImageIcon, GlobeHemisphereWest, Spinner, Play, Pause } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchUserRooms,
  fetchMessages,
  subscribeToMessages,
  sendMessage,
  uploadChatMedia,
  markChatSeen,
  Profile,
  Room,
  ChatMessage,
} from "@/lib/chat";

export const Route = createFileRoute("/chat")({
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
  const currentUser = getCurrentUser();
  const userId = currentUser?.id;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | "global">("global");
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  
  // Media states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Audio playback state
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    fetchUserRooms().then((data) => setRooms(data));
  }, [userId]);

  useEffect(() => {
    const roomId = selectedChat === "global" ? null : selectedChat;
    fetchMessages(roomId).then((data) => setMessages(data));

    const unsubscribe = subscribeToMessages((newMsg) => {
      // Check if message belongs to current chat view
      const isGlobalMsg = newMsg.room_id === null;
      const isRoomMsg = newMsg.room_id === selectedChat;

      if ((selectedChat === "global" && isGlobalMsg) || (selectedChat !== "global" && isRoomMsg)) {
        setMessages((prev) => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    return () => unsubscribe();
  }, [selectedChat, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!userId) return;
    markChatSeen(userId);
  }, [messages.length, selectedChat, userId]);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    const q = searchQuery.toLowerCase();
    return rooms.filter((r) => {
      const otherParticipants = r.participants.filter(p => p.id !== userId);
      return otherParticipants.some(p => p.name.toLowerCase().includes(q));
    });
  }, [searchQuery, rooms, userId]);

  const handleSend = async (e?: React.FormEvent, mediaFile?: File, type?: "image" | "voice") => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text && !mediaFile) return;

    setIsSending(true);
    try {
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

      const roomId = selectedChat === "global" ? null : selectedChat;
      const sentMessage = await sendMessage({
        text,
        roomId,
        imageUrl,
        voiceUrl,
      });

      if (!sentMessage) {
        toast.error("Could not send message. Please log in again.");
        return;
      }

      setMessages((prev) => {
        if (prev.some((message) => message.id === sentMessage.id)) return prev;
        return [...prev, sentMessage];
      });
      setNewMessage("");
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'voice.webm', { type: 'audio/webm' });
        await handleSend(undefined, file, "voice");
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access denied", err);
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
      // Pause currently playing if any
      if (playingAudio && audioRefs.current[playingAudio]) {
        audioRefs.current[playingAudio].pause();
      }
      audio.play();
      setPlayingAudio(id);
    }
  };

  const getChatName = () => {
    if (selectedChat === "global") return "Global Hub";
    const r = rooms.find(r => r.id === selectedChat);
    if (!r) return "Chat";
    const others = r.participants.filter(p => p.id !== userId);
    return others.length > 0 ? others.map(o => o.name).join(", ") : "Room";
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-primary tracking-wide uppercase">Communications Hub</h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">Eruka Network</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" style={{ height: "calc(100vh - 16rem)" }}>
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
            <button
              onClick={() => setSelectedChat("global")}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                selectedChat === "global" ? "bg-primary/10 border border-primary/20" : "hover:bg-muted border border-transparent"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full shrink-0 shadow-lg ${
                selectedChat === "global" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"
              }`}>
                <GlobeHemisphereWest weight="fill" className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className="text-sm font-bold text-foreground tracking-wide">Global Hub</span>
                <p className="text-xs text-primary animate-pulse">Public Channel</p>
              </div>
            </button>

            <div className="pt-4 pb-2 px-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Rooms</span>
            </div>

            {filteredRooms.map((room) => {
              const others = room.participants ? room.participants.filter(p => p.id !== userId) : [];
              const displayName = others.length > 0 ? others.map(o => o?.name).filter(Boolean).join(", ") || "Room" : "Room";
              const displayRole = others.length === 1 ? (others[0]?.role || "Group") : "Group";
              
              return (
              <button
                key={room.id}
                onClick={() => setSelectedChat(room.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                  selectedChat === room.id ? "bg-muted/50 border border-primary/20" : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-sm font-bold text-foreground shrink-0 shadow-inner">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <span className="text-sm font-semibold text-foreground truncate block">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground capitalize">{displayRole}</span>
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-full shadow-lg ${
              selectedChat === "global" ? "bg-primary text-primary-foreground" : "bg-gray-800 text-foreground"
            }`}>
              {selectedChat === "global" ? <GlobeHemisphereWest weight="fill" className="h-5 w-5" /> : getChatName().charAt(0)}
            </div>
            <div>
              <p className="text-md font-bold text-foreground tracking-wide">{getChatName()}</p>
              <p className="text-[10px] text-primary uppercase tracking-widest font-bold">Secure Connection</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-background">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 animate-fade-in">
                <ChatCircleDots weight="light" className="h-12 w-12 opacity-20" />
                <p className="text-sm tracking-wide">No messages intercepted yet. Begin transmission.</p>
              </div>
            )}
            {(messages || []).map((msg) => {
              if (!msg) return null;
              const isMine = msg.sender_id === userId;
              const senderName = msg.sender?.name || "Unknown Node";
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                  {!isMine && selectedChat === "global" && (
                    <span className="text-[10px] text-muted-foreground mb-1 ml-1 font-semibold">{senderName}</span>
                  )}
                  
                  <div className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-lg relative ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground border border-border rounded-bl-sm"
                  }`}>
                    {msg.image_url && (
                      <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden bg-black/20">
                        <img src={msg.image_url} alt="Shared" className="w-full h-auto object-cover max-h-60 rounded-t-xl" />
                      </div>
                    )}
                    
                    {msg.voice_url && (
                      <div className={`flex items-center gap-3 p-2 rounded-xl mb-2 ${isMine ? "bg-black/10" : "bg-muted"}`}>
                        <button 
                          onClick={() => toggleAudio(msg.id, msg.voice_url!)}
                          className={`h-10 w-10 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-md ${
                            isMine ? "bg-background text-primary" : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {playingAudio === msg.id ? <Pause weight="fill" className="h-4 w-4" /> : <Play weight="fill" className="h-4 w-4 ml-1" />}
                        </button>
                        <div className="flex-1 flex items-center">
                           {/* Simple mock waveform */}
                           <div className="flex gap-1 items-center h-6 w-32">
                             {[1,2,3,4,5,6,7,8,1,2].map((v, i) => (
                               <div key={i} className={`w-1 rounded-full ${isMine ? 'bg-primary-foreground/50' : 'bg-primary/40'} ${playingAudio === msg.id ? 'animate-pulse' : ''}`} style={{ height: `${20 + (v*10)}%` }}></div>
                             ))}
                           </div>
                        </div>
                      </div>
                    )}
                    
                    {msg.text && <p className="text-[15px] leading-relaxed font-medium">{msg.text}</p>}
                    
                    <div className={`mt-2 flex items-center gap-1 justify-end text-[10px] font-bold ${
                      isMine ? "text-primary-foreground/70" : "text-muted-foreground/60"
                    }`}>
                      {(() => {
                        const d = new Date(msg.created_at);
                        return isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                      })()}
                      {isMine && <Checks weight="bold" className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-card border-t border-border">
            <form onSubmit={handleSend} className="flex items-center gap-3 bg-muted rounded-full p-2 border border-border shadow-inner focus-within:border-primary/50 transition-colors">
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
                className="h-10 w-10 rounded-full flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-muted transition-colors shrink-0"
              >
                <ImageIcon weight="fill" className="h-5 w-5" />
              </button>

              <input
                placeholder={isRecording ? "Recording transmission..." : "Type a message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isRecording || isSending}
                className="flex-1 bg-transparent border-none text-foreground focus:outline-none focus:ring-0 placeholder-muted-foreground text-sm px-2 disabled:opacity-50"
              />

              {newMessage.trim() ? (
                <Button 
                  type="submit" 
                  disabled={isSending}
                  className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 p-0 shadow-lg shadow-primary/20"
                >
                  {isSending ? <Spinner weight="bold" className="h-4 w-4 animate-spin" /> : <PaperPlaneRight weight="fill" className="h-4 w-4" />}
                </Button>
              ) : (
                <button
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 transition-all shadow-lg ${
                    isRecording 
                      ? "bg-red-500 text-foreground animate-pulse scale-110 shadow-red-500/40" 
                      : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20"
                  }`}
                >
                  {isSending ? <Spinner weight="bold" className="h-4 w-4 animate-spin" /> : <Microphone weight="fill" className="h-5 w-5" />}
                </button>
              )}
            </form>
            <p className="text-center text-[10px] text-foreground/30 mt-3 font-medium uppercase tracking-widest">
              {isRecording ? "Release to send voice transmission" : "Hold microphone to record voice"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
