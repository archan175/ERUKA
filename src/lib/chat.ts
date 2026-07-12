import { getCurrentUser, getRegisteredUsers, type AuthUser } from "./auth";
import { isSupabaseConfigured, supabase } from "./supabase";

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  text: string | null;
  image_url: string | null;
  voice_url: string | null;
  created_at: string;
  sender?: Profile;
};

const LOCAL_MESSAGES_KEY = "eruka_chat_messages";
const LAST_SEEN_PREFIX = "eruka_chat_last_seen_";

function isBrowser() {
  return typeof window !== "undefined";
}

function profileFromUser(user: AuthUser): Profile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

function normalizeMessage(row: any): ChatMessage {
  const receiverId = row.receiver_id ?? row.receiverId ?? null;
  const sender = row.sender
    ? {
        id: String(row.sender.id),
        name: row.sender.name,
        email: row.sender.email,
        role: row.sender.role,
      }
    : undefined;

  return {
    id: String(row.id),
    sender_id: String(row.sender_id ?? row.senderId),
    receiver_id: receiverId ? String(receiverId) : null,
    text: row.text ?? row.message ?? null,
    image_url: row.image_url ?? row.imageUrl ?? null,
    voice_url: row.voice_url ?? row.voiceUrl ?? null,
    created_at: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    sender,
  };
}

function readLocalMessages(): ChatMessage[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(LOCAL_MESSAGES_KEY);
  if (!raw) return [];

  try {
    return (JSON.parse(raw) as any[]).map(normalizeMessage);
  } catch {
    return [];
  }
}

function writeLocalMessages(messages: ChatMessage[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
}

function getSenderProfile(senderId: string): Profile | undefined {
  const currentUser = getCurrentUser();
  if (currentUser?.id === senderId) return profileFromUser(currentUser);

  return getRegisteredUsers().map(profileFromUser).find((profile) => profile.id === senderId);
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function mergeMessages(primary: ChatMessage[], fallback: ChatMessage[]) {
  const byId = new Map<string, ChatMessage>();
  [...fallback, ...primary].forEach((message) => {
    byId.set(message.id, {
      ...message,
      sender: message.sender || getSenderProfile(message.sender_id),
    });
  });
  return sortMessages([...byId.values()]);
}

function filterLocalMessages(receiverId: string | null = null) {
  const currentUser = getCurrentUser();
  const messages = readLocalMessages();

  if (receiverId === null) {
    return sortMessages(messages.filter((message) => message.receiver_id === null));
  }

  if (!currentUser) return [];

  return sortMessages(
    messages.filter(
      (message) =>
        (message.sender_id === currentUser.id && message.receiver_id === receiverId) ||
        (message.sender_id === receiverId && message.receiver_id === currentUser.id),
    ),
  );
}

function visibleLocalMessages() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  return sortMessages(
    readLocalMessages().filter(
      (message) =>
        message.receiver_id === null ||
        message.sender_id === currentUser.id ||
        message.receiver_id === currentUser.id,
    ),
  );
}

async function fetchRemoteMessages(receiverId?: string | null) {
  if (!isSupabaseConfigured || !supabase) return null;

  let query = supabase
    .from("messages")
    .select(
      `
      *,
      sender:sender_id (
        id, name, email, role
      )
    `,
    )
    .order("created_at", { ascending: true })
    .limit(200);

  if (receiverId === null) {
    query = query.is("receiver_id", null);
  } else if (receiverId) {
    const { data: userData } = await supabase.auth.getUser();
    const myId = userData.user?.id;
    if (!myId) return null;
    query = query.or(
      `and(sender_id.eq.${myId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${myId})`,
    );
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("Error fetching messages:", error);
    return null;
  }

  return data.map(normalizeMessage);
}

export async function fetchProfiles(): Promise<Profile[]> {
  const localProfiles = getRegisteredUsers().map(profileFromUser);

  if (!isSupabaseConfigured || !supabase) return localProfiles;

  const { data, error } = await supabase.from("profiles").select("id,name,email,role");
  if (error || !data) {
    if (error) console.error("Error fetching profiles:", error);
    return localProfiles;
  }

  const remoteProfiles = data.map((profile) => ({
    id: String(profile.id),
    name: profile.name,
    email: profile.email,
    role: profile.role,
  }));

  const seen = new Set(remoteProfiles.map((profile) => profile.id));
  return [...remoteProfiles, ...localProfiles.filter((profile) => !seen.has(profile.id))];
}

export async function fetchMessages(receiverId: string | null = null): Promise<ChatMessage[]> {
  const remoteMessages = await fetchRemoteMessages(receiverId);
  return mergeMessages(remoteMessages || [], filterLocalMessages(receiverId));
}

export async function fetchInboxMessages(): Promise<ChatMessage[]> {
  const remoteMessages = await fetchRemoteMessages(undefined);
  return mergeMessages(remoteMessages || [], visibleLocalMessages());
}

function readFileAsDataUrl(file: File): Promise<string | null> {
  if (!isBrowser()) return Promise.resolve(null);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function uploadChatMedia(file: File, type: "image" | "voice"): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const ext = type === "image" ? file.name.split(".").pop() || "png" : "webm";
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${type}s/${fileName}`;

    const { error } = await supabase.storage.from("chat_media").upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (!error) {
      const { data } = supabase.storage.from("chat_media").getPublicUrl(filePath);
      return data.publicUrl;
    }

    console.error(`Error uploading ${type}, using local fallback:`, error);
  }

  return readFileAsDataUrl(file);
}

export async function sendMessage({
  text,
  receiverId,
  imageUrl,
  voiceUrl,
}: {
  text?: string;
  receiverId?: string | null;
  imageUrl?: string | null;
  voiceUrl?: string | null;
}) {
  const cleanText = text?.trim() || null;
  const currentUser = getCurrentUser();

  if (isSupabaseConfigured && supabase) {
    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData.user;

    if (authUser) {
      const profile: Profile = {
        id: authUser.id,
        name:
          currentUser?.name ||
          authUser.user_metadata?.name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "ERUKA User",
        email: currentUser?.email || authUser.email || "",
        role: currentUser?.role || authUser.user_metadata?.role || "freelancer",
      };

      await supabase.from("profiles").upsert(profile);

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: authUser.id,
            receiver_id: receiverId || null,
            text: cleanText,
            image_url: imageUrl || null,
            voice_url: voiceUrl || null,
          },
        ])
        .select(
          `
          *,
          sender:sender_id (
            id, name, email, role
          )
        `,
        )
        .single();

      if (!error && data) return normalizeMessage(data);
      if (error) console.error("Error sending message, using local fallback:", error);
    }
  }

  if (!currentUser) return null;

  const localMessage: ChatMessage = {
    id: crypto.randomUUID ? crypto.randomUUID() : `message-${Date.now()}`,
    sender_id: currentUser.id,
    receiver_id: receiverId || null,
    text: cleanText,
    image_url: imageUrl || null,
    voice_url: voiceUrl || null,
    created_at: new Date().toISOString(),
    sender: profileFromUser(currentUser),
  };

  writeLocalMessages([...readLocalMessages(), localMessage]);

  if (isBrowser()) {
    window.dispatchEvent(new CustomEvent("eruka:chat-message", { detail: { message: localMessage } }));
  }

  return localMessage;
}

export function subscribeToMessages(onMessage: (msg: ChatMessage) => void) {
  const unsubscribers: Array<() => void> = [];
  const seenLocalIds = new Set(readLocalMessages().map((message) => message.id));

  if (isBrowser()) {
    const onLocalMessage = (event: Event) => {
      const message = (event as CustomEvent<{ message: ChatMessage }>).detail?.message;
      if (!message || seenLocalIds.has(message.id)) return;
      seenLocalIds.add(message.id);
      onMessage(message);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LOCAL_MESSAGES_KEY) return;
      readLocalMessages().forEach((message) => {
        if (seenLocalIds.has(message.id)) return;
        seenLocalIds.add(message.id);
        onMessage(message);
      });
    };

    window.addEventListener("eruka:chat-message", onLocalMessage);
    window.addEventListener("storage", onStorage);
    unsubscribers.push(() => {
      window.removeEventListener("eruka:chat-message", onLocalMessage);
      window.removeEventListener("storage", onStorage);
    });
  }

  if (isSupabaseConfigured && supabase) {
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const { data: senderData } = await supabase
            .from("profiles")
            .select("id, name, email, role")
            .eq("id", payload.new.sender_id)
            .single();

          onMessage(
            normalizeMessage({
              ...payload.new,
              sender: senderData || undefined,
            }),
          );
        },
      )
      .subscribe();

    unsubscribers.push(() => {
      void supabase.removeChannel(channel);
    });
  }

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}

export function getChatLastSeen(userId = getCurrentUser()?.id) {
  if (!isBrowser() || !userId) return 0;
  return Number(window.localStorage.getItem(`${LAST_SEEN_PREFIX}${userId}`) || 0);
}

export function markChatSeen(userId = getCurrentUser()?.id) {
  if (!isBrowser() || !userId) return;
  window.localStorage.setItem(`${LAST_SEEN_PREFIX}${userId}`, String(Date.now()));
  window.dispatchEvent(new CustomEvent("eruka:chat-seen", { detail: { userId } }));
}

export async function fetchUnreadMessages(): Promise<ChatMessage[]> {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  const lastSeen = getChatLastSeen(currentUser.id);
  const messages = await fetchInboxMessages();

  return messages.filter(
    (message) =>
      message.sender_id !== currentUser.id &&
      new Date(message.created_at).getTime() > lastSeen,
  );
}
