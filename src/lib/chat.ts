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
  room_id: string | null;
  text: string | null;
  image_url: string | null;
  voice_url: string | null;
  created_at: string;
  sender?: Profile;
};

export type Room = {
  id: string;
  associated_bid_id: string;
  created_at: string;
  participants: Profile[];
  title?: string;
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
  const roomId = row.room_id ?? row.roomId ?? null;
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
    room_id: roomId ? String(roomId) : null,
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

function filterLocalMessages(roomId: string | null = null) {
  const messages = readLocalMessages();

  if (roomId === null) {
    return sortMessages(messages.filter((message) => message.room_id === null));
  }

  return sortMessages(
    messages.filter((message) => message.room_id === roomId)
  );
}

function visibleLocalMessages() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  // Note: For local messages, we just return all non-global messages the user sent 
  // or global messages since we don't have local room membership fully synced
  return sortMessages(
    readLocalMessages().filter(
      (message) =>
        message.room_id === null ||
        message.sender_id === currentUser.id
    ),
  );
}

async function fetchRemoteMessages(roomId?: string | null) {
  if (!isSupabaseConfigured || !supabase) return null;

  let query = supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(200);

  if (roomId === null) {
    query = query.is("room_id", null);
  } else if (roomId) {
    query = query.eq("room_id", roomId);
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("Error fetching messages:", error);
    return null;
  }

  const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
  const profilesMap: Record<string, any> = {};

  if (senderIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .in("id", senderIds);

    if (profileData) {
      profileData.forEach((p) => {
        profilesMap[p.id] = p;
      });
    }
  }

  return data.map((msg: any) =>
    normalizeMessage({
      ...msg,
      sender: profilesMap[msg.sender_id] || undefined,
    }),
  );
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

export async function fetchUserRooms(): Promise<Room[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  const { data: participantsData, error: pError } = await supabase
    .from("room_participants")
    .select("room_id")
    .eq("profile_id", currentUser.id);

  if (pError || !participantsData || participantsData.length === 0) return [];

  const roomIds = participantsData.map((p) => p.room_id);

  // Fetch rooms and their participants
  const { data: roomsData, error: rError } = await supabase
    .from("rooms")
    .select(`
      id,
      associated_bid_id,
      created_at,
      room_participants (
        profile:profiles(id, name, email, role)
      )
    `)
    .in("id", roomIds)
    .order("created_at", { ascending: false });

  if (rError || !roomsData) return [];

  return roomsData.map((room) => ({
    id: room.id,
    associated_bid_id: room.associated_bid_id,
    created_at: room.created_at,
    participants: (room.room_participants || [])
      .map((rp: any) => rp.profile)
      .filter(Boolean),
  }));
}

export async function fetchMessages(roomId: string | null = null): Promise<ChatMessage[]> {
  const remoteMessages = await fetchRemoteMessages(roomId);
  return mergeMessages(remoteMessages || [], filterLocalMessages(roomId));
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
  roomId,
  imageUrl,
  voiceUrl,
}: {
  text?: string;
  roomId?: string | null;
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
            room_id: roomId || null,
            text: cleanText,
            image_url: imageUrl || null,
            voice_url: voiceUrl || null,
          },
        ])
        .select("*")
        .single();

      if (!error && data) {
        return normalizeMessage({
          ...data,
          sender: profile,
        });
      }
      if (error) console.error("Error sending message, using local fallback:", error);
    }
  }

  if (!currentUser) return null;

  const localMessage: ChatMessage = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `message-${Date.now()}`,
    sender_id: currentUser.id,
    room_id: roomId || null,
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
    const channelId = `public:messages:${Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const { data: senderData } = await supabase!
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
      void supabase!.removeChannel(channel);
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

export async function acceptBidAndCreateRoom(bid: any, job: any): Promise<string | null> {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  if (isSupabaseConfigured && supabase) {
    // 1. Create Room
    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .insert({ associated_bid_id: bid.id })
      .select("id")
      .single();

    if (roomError || !roomData) {
      console.error("Error creating room:", roomError);
      return null;
    }

    const roomId = roomData.id;

    // 2. Create participants (job owner and freelancer)
    const participants = [
      { room_id: roomId, profile_id: job.recruiterId },
      { room_id: roomId, profile_id: bid.freelancerId }
    ];

    await supabase.from("room_participants").insert(participants);

    // 3. Send automated first message
    await sendMessage({
      text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
      roomId: roomId,
    });

    return roomId;
  }
  
  // Local fallback: create a fake room
  const localRoomId = `room-${Date.now()}`;
  await sendMessage({
    text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
    roomId: localRoomId,
  });
  return localRoomId;
}
