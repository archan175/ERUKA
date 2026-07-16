import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PaperPlaneRight,
  ChatCircleDots,
  Checks,
  Check,
  Microphone,
  Image as ImageIcon,
  GlobeHemisphereWest,
  Spinner,
  Play,
  Pause,
  MagnifyingGlass,
  Paperclip,
  Smiley,
  ArrowLeft,
  Circle,
  File as FileIcon,
  DownloadSimple,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { getCurrentUser } from "@/lib/auth";
import {
  fetchUserConversations,
  fetchMessages,
  subscribeToMessages,
  sendMessage,
  uploadChatMedia,
  markChatSeen,
  markMessagesAsRead,
  getGlobalConversationId,
  profileMatchesUser,
  type Conversation,
  type ChatMessage,
  type Profile,
} from "@/lib/chat";
import { usePresence } from "@/hooks/usePresence";
import { useTyping } from "@/hooks/useTyping";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ChatSearch = {
  room?: string;
  conversation?: string;
};

function getOtherMembers(conversation: Conversation, user: ReturnType<typeof getCurrentUser>, authUid?: string | null) {
  if (!user) return conversation.members;
  return conversation.members.filter(
    (m) => !profileMatchesUser(m, user) && (!authUid || m.id !== authUid),
  );
}

function getConversationDisplay(
  conversation: Conversation,
  user: ReturnType<typeof getCurrentUser>,
  authUid?: string | null,
) {
  if (conversation.type === "global") {
    return {
      name: "Global Hub",
      role: "Public Channel",
      initial: "G",
      avatar_url: undefined,
    };
  }

  const others = getOtherMembers(conversation, user, authUid);
  const visibleMembers = others.length > 0 ? others : conversation.members;
  const name =
    visibleMembers.map((m) => m?.name).filter(Boolean).join(", ") ||
    conversation.title ||
    "Private Room";

  return {
    name,
    role: conversation.title || (others.length === 1 ? others[0]?.role || "Private" : "Private"),
    initial: (name.trim()[0] || "R").toUpperCase(),
    avatar_url: others.length === 1 ? others[0]?.avatar_url : undefined,
  };
}

function formatRelativeTime(dateStr: string) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatLastSeen(dateStr?: string) {
  if (!dateStr) return "Offline";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Offline";
  return `Last seen ${formatRelativeTime(dateStr)}`;
}

function UserAvatar({ profile, size = "md", isOnline }: { profile?: Profile | null; size?: "sm" | "md" | "lg"; isOnline?: boolean }) {
  const sizeClasses = {
    sm: "h-8 w-8 text-[11px]",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };

  const initial = (profile?.name?.trim()?.[0] || "U").toUpperCase();

  return (
    <div className="relative shrink-0">
      {profile?.avatar_url ? (
        <img
          src={profile.avatar_url}
          alt={profile.name}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-border/50`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold bg-gradient-to-br from-primary/20 to-primary/40 text-primary ring-2 ring-border/50`}
        >
          {initial}
        </div>
      )}
      {typeof isOnline === "boolean" && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
            isOnline ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
          }`}
        />
      )}
    </div>
  );
}

function DeliveryStatus({ status, isMine }: { status: string; isMine: boolean }) {
  if (!isMine) return null;

  const colorClass = status === "read" ? "text-blue-400" : "text-current opacity-50";

  switch (status) {
    case "sending":
      return <Spinner weight="bold" className={`h-3 w-3 animate-spin ${colorClass}`} />;
    case "sent":
      return <Check weight="bold" className={`h-3 w-3 ${colorClass}`} />;
    case "delivered":
      return <Checks weight="bold" className={`h-3 w-3 ${colorClass}`} />;
    case "read":
      return <Checks weight="bold" className={`h-3 w-3 ${colorClass}`} />;
    default:
      return <Check weight="bold" className={`h-3 w-3 ${colorClass}`} />;
  }
}

function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div className={`flex gap-3 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
            <div className="h-10 w-10 rounded-full skeleton shrink-0" />
            <div className="space-y-2">
              <div className="h-3 w-20 rounded skeleton" />
              <div className={`h-16 ${i % 3 === 0 ? "w-64" : "w-48"} rounded-2xl skeleton`} />
              <div className="h-2 w-12 rounded skeleton ml-auto" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="p-2 space-y-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
          <div className="h-10 w-10 rounded-full skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-24 rounded skeleton" />
            <div className="h-2.5 w-32 rounded skeleton" />
          </div>
          <div className="h-2.5 w-10 rounded skeleton" />
        </div>
      ))}
    </div>
  );
}

export const Route = createFileRoute("/chat")({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    room: typeof search.room === "string" ? search.room : undefined,
    conversation: typeof search.conversation === "string" ? search.conversation : undefined,
  }),
  beforeLoad: () => {
    if (!getCurrentUser()) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Messages — ERUKA" },
      { name: "description", content: "Chat globally and privately on ERUKA." },
    ],
  }),
  component: ChatPage,
});

function ChatPage() {
  const search = Route.useSearch();
  const currentUser = getCurrentUser();

  const [authUid, setAuthUid] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setAuthUid(data.user.id);
    });
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const { isOnline } = usePresence();
  const { typingText, emitTyping } = useTyping(selectedChat);

  // Initialize with the correct chat from URL or global
  useEffect(() => {
    const init = async () => {
      const urlChat = search.conversation || search.room;
      if (urlChat) {
        setSelectedChat(urlChat);
        setShowMobileChat(true);
      } else {
        const globalId = await getGlobalConversationId();
        setSelectedChat(globalId);
      }
    };
    void init();
  }, [search.room, search.conversation]);

  // Fetch conversations
  useEffect(() => {
    const refreshConversations = async () => {
      setIsLoadingConversations(true);
      try {
        const data = await fetchUserConversations();
        setConversations(data);
      } finally {
        setIsLoadingConversations(false);
      }
    };
    void refreshConversations();

    const handleConversationCreated = () => void refreshConversations();
    const handleBidsChanged = () => void refreshConversations();

    window.addEventListener("eruka:conversation-created", handleConversationCreated);
    window.addEventListener("eruka:room-created", handleConversationCreated);
    window.addEventListener("eruka:bids-changed", handleBidsChanged);
    return () => {
      window.removeEventListener("eruka:conversation-created", handleConversationCreated);
      window.removeEventListener("eruka:room-created", handleConversationCreated);
      window.removeEventListener("eruka:bids-changed", handleBidsChanged);
    };
  }, [authUid]);

  // Fetch messages and subscribe when selected chat changes
  useEffect(() => {
    if (!selectedChat) return;

    setIsLoadingMessages(true);
    void fetchMessages(selectedChat).then((data) => {
      setMessages(data);
      setIsLoadingMessages(false);
    });

    // Mark messages as read
    void markMessagesAsRead(selectedChat);

    const unsubscribe = subscribeToMessages(selectedChat, (newMsg) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Auto-mark as read if currently viewing
      void markMessagesAsRead(selectedChat);
    });

    return () => unsubscribe();
  }, [selectedChat, authUid]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typingText]);

  // Mark seen
  useEffect(() => {
    const uid = authUid || currentUser?.id;
    if (!uid) return;
    markChatSeen(uid);
  }, [messages.length, selectedChat, authUid, currentUser]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showEmojiPicker]);

  // Auto-resize textarea
  const handleTextareaInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter((c) => {
      const d = getConversationDisplay(c, currentUser, authUid);
      return d.name.toLowerCase().includes(q) || c.title?.toLowerCase().includes(q);
    });
  }, [searchQuery, conversations, currentUser, authUid]);

  // Find global conversation in the list
  const globalConversation = conversations.find((c) => c.type === "global");
  const privateConversations = filteredConversations.filter((c) => c.type !== "global");

  function isMine(msg: ChatMessage) {
    if (!currentUser) return false;
    if (authUid && msg.sender_id === authUid) return true;
    if (msg.sender_id === currentUser.id) return true;
    if (msg.sender_id.toLowerCase() === currentUser.email.toLowerCase()) return true;
    if (msg.sender?.email?.toLowerCase() === currentUser.email.toLowerCase()) return true;
    return false;
  }

  const handleSend = async (e?: React.FormEvent, mediaFile?: File, type?: "image" | "voice" | "document") => {
    if (e) e.preventDefault();
    const text = newMessage.trim();
    if (!text && !mediaFile) return;
    if (!selectedChat) return;

    setIsSending(true);
    try {
      let imageUrl: string | null = null;
      let voiceUrl: string | null = null;
      let attachmentUrl: string | null = null;
      let attachmentType: string | null = null;
      let attachmentName: string | null = null;

      if (mediaFile && type) {
        const url = await uploadChatMedia(mediaFile, type);
        if (!url && !text) {
          toast.error(`Could not attach ${type === "image" ? "image" : type === "voice" ? "voice message" : "document"}`);
          return;
        }
        if (type === "image") imageUrl = url;
        else if (type === "voice") voiceUrl = url;
        else if (type === "document") {
          attachmentUrl = url;
          attachmentType = mediaFile.type || "application/octet-stream";
          attachmentName = mediaFile.name;
        }
      }

      const sent = await sendMessage({
        text,
        conversationId: selectedChat,
        imageUrl,
        voiceUrl,
        attachmentUrl,
        attachmentType,
        attachmentName,
      });

      if (!sent) {
        toast.error("Could not send message. Please log in again.");
        return;
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setNewMessage("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (docInputRef.current) docInputRef.current.value = "";
      textareaRef.current?.focus();
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

  const selectedConversation = selectedChat
    ? conversations.find((c) => c.id === selectedChat)
    : null;

  const chatDisplay = selectedConversation
    ? getConversationDisplay(selectedConversation, currentUser, authUid)
    : selectedChat === "global" || selectedChat === globalConversation?.id
      ? { name: "Global Hub", role: "Public Channel", initial: "G", avatar_url: undefined }
      : { name: "Chat", role: "", initial: "C", avatar_url: undefined };

  const otherMembers = selectedConversation ? getOtherMembers(selectedConversation, currentUser, authUid) : [];
  const chatPartner = otherMembers.length === 1 ? otherMembers[0] : null;
  const isGlobal = selectedConversation?.type === "global" || selectedChat === "global";

  // Common emoji list for the simple picker
  const commonEmojis = ["😀", "😂", "❤️", "👍", "🔥", "🎉", "💯", "✨", "🙏", "👀", "😍", "🤝", "💪", "🚀", "✅", "⭐", "📌", "💡", "🎯", "👋"];

  const selectConversation = (id: string) => {
    setSelectedChat(id);
    setShowMobileChat(true);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Messages
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-1">
            ERUKA Communications
          </p>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-0 lg:grid-cols-[340px_1fr] lg:gap-4"
        style={{ height: "calc(100vh - 14rem)" }}
      >
        {/* ────────────── SIDEBAR ────────────── */}
        <Card
          className={`bg-card border-border overflow-hidden flex flex-col ${
            showMobileChat ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Search */}
          <div className="p-3 border-b border-border bg-card">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                placeholder="Search conversations..."
                className="w-full bg-muted/50 border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {isLoadingConversations ? (
              <ConversationSkeleton />
            ) : (
              <>
                {/* Global Hub */}
                <button
                  onClick={() => selectConversation(globalConversation?.id || "global")}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                    selectedChat === globalConversation?.id || (selectedChat === "global" && !globalConversation)
                      ? "bg-primary/10 border border-primary/20 shadow-sm"
                      : "hover:bg-muted/60 border border-transparent"
                  }`}
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full shrink-0 shadow-md ${
                    selectedChat === globalConversation?.id || selectedChat === "global"
                      ? "bg-gradient-to-br from-primary to-blue-600 text-white"
                      : "bg-muted text-foreground"
                  }`}>
                    <GlobeHemisphereWest weight="fill" className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <span className="text-sm font-bold text-foreground tracking-wide block">Global Hub</span>
                    <p className="text-[11px] text-primary font-semibold flex items-center gap-1">
                      <Circle weight="fill" className="h-2 w-2 text-emerald-500" />
                      Live · Public Channel
                    </p>
                  </div>
                </button>

                {/* Private conversations label */}
                {privateConversations.length > 0 && (
                  <div className="pt-3 pb-1 px-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em]">
                      Direct Messages
                    </span>
                  </div>
                )}

                {/* Private conversations */}
                {privateConversations.map((conv) => {
                  const display = getConversationDisplay(conv, currentUser, authUid);
                  const others = getOtherMembers(conv, currentUser, authUid);
                  const partner = others[0];
                  const partnerOnline = partner ? isOnline(partner.id) : false;
                  const lastMsg = conv.last_message;
                  const lastMsgText = lastMsg?.text
                    ? lastMsg.text.length > 35
                      ? lastMsg.text.slice(0, 35) + "..."
                      : lastMsg.text
                    : lastMsg?.image_url
                      ? "📷 Photo"
                      : lastMsg?.voice_url
                        ? "🎤 Voice message"
                        : lastMsg?.attachment_url
                          ? `📎 ${lastMsg.attachment_name || "Document"}`
                          : null;

                  return (
                    <button
                      key={conv.id}
                      onClick={() => selectConversation(conv.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        selectedChat === conv.id
                          ? "bg-primary/8 border border-primary/15 shadow-sm"
                          : "hover:bg-muted/60 border border-transparent"
                      }`}
                    >
                      <UserAvatar
                        profile={partner}
                        size="md"
                        isOnline={partnerOnline}
                      />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">
                            {display.name}
                          </span>
                          {lastMsg && (
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {formatRelativeTime(lastMsg.created_at)}
                            </span>
                          )}
                        </div>
                        {conv.title && (
                          <p className="text-[11px] text-primary/80 font-medium truncate">{conv.title}</p>
                        )}
                        {lastMsgText && (
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {lastMsgText}
                          </p>
                        )}
                      </div>
                      {conv.unread_count && conv.unread_count > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                          {conv.unread_count > 9 ? "9+" : conv.unread_count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}

                {privateConversations.length === 0 && !isLoadingConversations && (
                  <p className="text-xs text-muted-foreground text-center py-6 px-4">
                    No private conversations yet. Accept a bid to start a private chat.
                  </p>
                )}
              </>
            )}
          </div>
        </Card>

        {/* ────────────── CHAT AREA ────────────── */}
        <Card
          className={`bg-background border-border flex flex-col overflow-hidden relative shadow-xl ${
            showMobileChat ? "flex" : "hidden lg:flex"
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border p-4 bg-card/90 backdrop-blur-md z-10">
            {/* Back button for mobile */}
            <button
              className="lg:hidden shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setShowMobileChat(false)}
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            {isGlobal ? (
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-600 text-white shadow-md shrink-0">
                <GlobeHemisphereWest weight="fill" className="h-5 w-5" />
              </div>
            ) : (
              <UserAvatar
                profile={chatPartner}
                size="md"
                isOnline={chatPartner ? isOnline(chatPartner.id) : false}
              />
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground tracking-wide truncate">
                {isGlobal ? "Global Hub" : `Chat with ${chatDisplay.name}`}
              </p>
              <p className="text-[11px] text-muted-foreground font-medium truncate">
                {isGlobal ? (
                  <span className="text-primary font-semibold">All users · Live</span>
                ) : chatPartner ? (
                  <>
                    {isOnline(chatPartner.id) ? (
                      <span className="text-emerald-500 font-semibold flex items-center gap-1">
                        <Circle weight="fill" className="h-2 w-2" /> Online
                      </span>
                    ) : (
                      <span>{formatLastSeen(chatPartner.last_seen)}</span>
                    )}
                    {selectedConversation?.title && (
                      <span className="text-muted-foreground"> · {selectedConversation.title}</span>
                    )}
                  </>
                ) : (
                  selectedConversation?.title || "Private conversation"
                )}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-background chat-messages-scroll">
            {isLoadingMessages ? (
              <MessageSkeleton />
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4 animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-muted/30 flex items-center justify-center">
                  <ChatCircleDots weight="light" className="h-8 w-8 opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {isGlobal
                      ? "No messages yet. Be the first to say hello!"
                      : "No messages yet. Start the conversation!"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Messages are end-to-end secured
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                if (!msg) return null;
                const mine = isMine(msg);
                const senderName = msg.sender?.name || "ERUKA User";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${mine ? "flex-row-reverse" : ""} animate-chat-message`}
                  >
                    {/* Avatar (only for others) */}
                    {!mine && (
                      <UserAvatar
                        profile={msg.sender}
                        size="sm"
                      />
                    )}

                    <div className={`flex flex-col ${mine ? "items-end" : "items-start"} max-w-[75%]`}>
                      {/* Sender name */}
                      {!mine && (
                        <span className="text-[11px] text-primary font-semibold mb-1 ml-1">
                          {senderName}
                        </span>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                          mine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted/80 text-foreground border border-border/50 rounded-bl-md"
                        }`}
                      >
                        {/* Image */}
                        {msg.image_url && (
                          <div className="mb-2 -mx-2 -mt-1 rounded-t-xl overflow-hidden">
                            <img
                              src={msg.image_url}
                              alt="Shared image"
                              className="w-full h-auto object-cover max-h-64 rounded-t-xl cursor-pointer hover:opacity-90 transition-opacity"
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
                              className={`h-9 w-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-sm ${
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
                            <div className="flex gap-[3px] items-center h-6 flex-1">
                              {Array.from({ length: 18 }).map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-[3px] rounded-full transition-all ${mine ? "bg-primary-foreground/50" : "bg-primary/40"} ${playingAudio === msg.id ? "animate-pulse" : ""}`}
                                  style={{ height: `${30 + Math.sin(i * 0.8) * 20 + Math.random() * 15}%` }}
                                />
                              ))}
                            </div>
                            <span className={`text-[10px] shrink-0 ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                              Voice
                            </span>
                          </div>
                        )}

                        {/* Document attachment */}
                        {msg.attachment_url && (
                          <a
                            href={msg.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-all hover:opacity-80 ${
                              mine ? "bg-black/10" : "bg-background/50 border border-border/30"
                            }`}
                          >
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                              mine ? "bg-primary-foreground/20" : "bg-primary/10"
                            }`}>
                              <FileIcon weight="fill" className={`h-5 w-5 ${mine ? "text-primary-foreground" : "text-primary"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${mine ? "text-primary-foreground" : "text-foreground"}`}>
                                {msg.attachment_name || "Document"}
                              </p>
                              <p className={`text-[10px] ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                                {msg.attachment_type || "File"}
                              </p>
                            </div>
                            <DownloadSimple className={`h-4 w-4 shrink-0 ${mine ? "text-primary-foreground/60" : "text-muted-foreground"}`} />
                          </a>
                        )}

                        {/* Text */}
                        {msg.text && (
                          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                        )}

                        {/* Timestamp + delivery status */}
                        <div
                          className={`mt-1 flex items-center gap-1.5 justify-end text-[10px] ${
                            mine ? "text-primary-foreground/50" : "text-muted-foreground/50"
                          }`}
                        >
                          {(() => {
                            const d = new Date(msg.created_at);
                            return isNaN(d.getTime())
                              ? ""
                              : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          })()}
                          <DeliveryStatus status={msg.delivery_status} isMine={mine} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing indicator */}
            {typingText && (
              <div className="flex items-center gap-2.5 animate-chat-message">
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center">
                  <ChatCircleDots className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-2.5 border border-border/30">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-muted-foreground font-medium">{typingText}</span>
                    <span className="flex gap-0.5">
                      <span className="typing-dot" />
                      <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
                      <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-card border-t border-border">
            {/* Emoji picker */}
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="mb-2 p-3 bg-card border border-border rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200"
              >
                <div className="flex flex-wrap gap-1.5">
                  {commonEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        setNewMessage((prev) => prev + emoji);
                        textareaRef.current?.focus();
                      }}
                      className="h-9 w-9 rounded-lg hover:bg-muted flex items-center justify-center text-lg transition-all hover:scale-110"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form
              onSubmit={handleSend}
              className="flex items-end gap-2 bg-muted/40 rounded-2xl p-2 border border-border/60 shadow-inner focus-within:border-primary/40 transition-all"
            >
              {/* Hidden file inputs */}
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
              <input
                type="file"
                ref={docInputRef}
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.rar"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleSend(undefined, file, "document");
                }}
              />

              {/* Action buttons */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  title="Emoji"
                  className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Smiley weight="fill" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach image"
                  className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <ImageIcon weight="fill" className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  title="Attach document"
                  className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  <Paperclip weight="bold" className="h-5 w-5" />
                </button>
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                placeholder={isRecording ? "Recording..." : "Type a message..."}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTextareaInput();
                  emitTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                disabled={isRecording || isSending}
                rows={1}
                className="flex-1 bg-transparent border-none text-foreground focus:outline-none focus:ring-0 placeholder-muted-foreground text-sm px-2 py-2 resize-none max-h-[120px] disabled:opacity-50 min-h-[36px]"
              />

              {/* Send / Record button */}
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
            <p className="text-center text-[10px] text-foreground/25 mt-2 font-medium tracking-wide">
              {isRecording ? "Release to send voice message" : "Enter to send · Shift+Enter for new line"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
