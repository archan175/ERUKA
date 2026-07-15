import { getCurrentDataUser, getCurrentUser, getRegisteredUsers, type AuthUser } from "./auth";
import type { Bid, Job } from "./mock-data";
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
  associated_bid_id: string | null;
  created_at: string;
  participants: Profile[];
  title?: string;
};

const LOCAL_MESSAGES_KEY = "eruka_chat_messages";
const LOCAL_ROOMS_KEY = "eruka_chat_rooms";
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeProfile(row: unknown): Profile | null {
  const record = asRecord(row);
  if (!record?.id) return null;

  return {
    id: String(record.id),
    name: stringValue(record.name) || stringValue(record.email) || "ERUKA User",
    email: stringValue(record.email),
    role: stringValue(record.role, "freelancer"),
  };
}

function isUuid(value?: string | null) {
  return Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value),
  );
}

function sameIdentity(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function normalizeMessage(row: unknown): ChatMessage {
  const record = asRecord(row) || {};
  const roomId = record.room_id ?? record.roomId ?? null;
  const sender = normalizeProfile(record.sender) || undefined;

  return {
    id: String(record.id),
    sender_id: String(record.sender_id ?? record.senderId),
    room_id: roomId ? String(roomId) : null,
    text: stringValue(record.text ?? record.message) || null,
    image_url: stringValue(record.image_url ?? record.imageUrl) || null,
    voice_url: stringValue(record.voice_url ?? record.voiceUrl) || null,
    created_at: stringValue(record.created_at ?? record.createdAt, new Date().toISOString()),
    sender,
  };
}

function normalizeRoom(row: unknown): Room {
  const record = asRecord(row) || {};
  const participants = Array.isArray(record.participants) ? record.participants : [];

  return {
    id: String(record.id),
    associated_bid_id: stringValue(record.associated_bid_id ?? record.associatedBidId) || null,
    created_at: stringValue(record.created_at ?? record.createdAt, new Date().toISOString()),
    participants: participants.map(normalizeProfile).filter(Boolean) as Profile[],
    title: stringValue(record.title) || undefined,
  };
}

function readLocalMessages(): ChatMessage[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(LOCAL_MESSAGES_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeMessage) : [];
  } catch {
    return [];
  }
}

function writeLocalMessages(messages: ChatMessage[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
}

function readLocalRooms(): Room[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(LOCAL_ROOMS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeRoom) : [];
  } catch {
    return [];
  }
}

function writeLocalRooms(rooms: Room[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_ROOMS_KEY, JSON.stringify(rooms));
}

function getSenderProfile(senderId: string): Profile | undefined {
  const currentUser = getCurrentUser();
  if (
    currentUser &&
    (sameIdentity(currentUser.id, senderId) || sameIdentity(currentUser.email, senderId))
  ) {
    return profileFromUser(currentUser);
  }

  return getRegisteredUsers()
    .map(profileFromUser)
    .find((profile) => sameIdentity(profile.id, senderId) || sameIdentity(profile.email, senderId));
}

export function profileMatchesUser(profile: Profile, user: AuthUser) {
  return (
    sameIdentity(profile.id, user.id) ||
    sameIdentity(profile.id, user.email) ||
    sameIdentity(profile.email, user.email) ||
    sameIdentity(profile.email, user.id) ||
    sameIdentity(profile.name, user.name)
  );
}

function getLocalUserRooms(user = getCurrentUser()) {
  const rooms = readLocalRooms();
  if (!user) return [];

  return rooms.filter((room) =>
    room.participants.some((participant) => profileMatchesUser(participant, user)),
  );
}

function participantProfile(id: string, name: string, role: "freelancer" | "recruiter"): Profile {
  const currentUser = getCurrentUser();
  const registeredUser = getRegisteredUsers().find(
    (user) =>
      sameIdentity(user.id, id) || sameIdentity(user.email, id) || sameIdentity(user.name, name),
  );
  const user =
    currentUser &&
    (sameIdentity(currentUser.id, id) ||
      sameIdentity(currentUser.email, id) ||
      sameIdentity(currentUser.name, name))
      ? currentUser
      : registeredUser;

  return {
    id: user?.id || id,
    name: user?.name || name || "ERUKA User",
    email: user?.email || (id.includes("@") ? id : ""),
    role: user?.role || role,
  };
}

function rememberLocalRoom(room: Room) {
  const rooms = readLocalRooms();
  const existingRoom = rooms.find((item) => item.id === room.id);
  const normalizedRoom = normalizeRoom(room);

  if (existingRoom && JSON.stringify(existingRoom) === JSON.stringify(normalizedRoom)) {
    return;
  }

  writeLocalRooms(mergeRooms([normalizedRoom], rooms));

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent("eruka:room-created", { detail: { room: normalizedRoom } }),
    );
  }
}

function mergeRooms(primary: Room[], fallback: Room[]) {
  const byId = new Map<string, Room>();
  [...fallback, ...primary].forEach((room) => {
    byId.set(room.id, room);
  });

  return [...byId.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
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

  const userRooms = new Set(getLocalUserRooms().map((room) => room.id));
  return sortMessages(
    messages.filter((message) => message.room_id === roomId && userRooms.has(roomId)),
  );
}

function visibleLocalMessages() {
  const currentUser = getCurrentUser();
  if (!currentUser) return [];

  const userRooms = new Set(getLocalUserRooms(currentUser).map((room) => room.id));
  return sortMessages(
    readLocalMessages().filter(
      (message) =>
        message.room_id === null ||
        message.sender_id === currentUser.id ||
        Boolean(message.room_id && userRooms.has(message.room_id)),
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

  const senderIds = [
    ...new Set(
      data
        .map((message) => asRecord(message)?.sender_id)
        .filter((senderId): senderId is string => typeof senderId === "string"),
    ),
  ];
  const profilesMap: Record<string, Profile> = {};

  if (senderIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, name, email, role")
      .in("id", senderIds);

    if (profileData) {
      profileData.forEach((p) => {
        const profile = normalizeProfile(p);
        if (profile) profilesMap[profile.id] = profile;
      });
    }
  }

  return data.map((msg) => {
    const message = asRecord(msg) || {};
    const senderId = String(message.sender_id || "");
    return normalizeMessage({
      ...message,
      sender: profilesMap[senderId] || undefined,
    });
  });
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
  const localRooms = getLocalUserRooms(await getCurrentDataUser());
  if (!isSupabaseConfigured || !supabase) return localRooms;

  // Always use the actual Supabase auth UID (not the local user.id which may be a mock)
  const { data: sessionData } = await supabase.auth.getUser();
  const authUid = sessionData?.user?.id;
  if (!authUid) return localRooms;

  const { data: participantsData, error: pError } = await supabase
    .from("room_participants")
    .select("room_id")
    .eq("profile_id", authUid);

  if (pError || !participantsData || participantsData.length === 0) return localRooms;

  const roomIds = participantsData.map((p) => p.room_id);

  // Fetch rooms with participants and their profiles
  const { data: roomsData, error: rError } = await supabase
    .from("rooms")
    .select(
      `
      id,
      associated_bid_id,
      created_at,
      room_participants (
        profile:profiles(id, name, email, role)
      )
    `,
    )
    .in("id", roomIds)
    .order("created_at", { ascending: false });

  if (rError || !roomsData) return localRooms;

  const remoteRooms = roomsData.map((room) => ({
    id: room.id,
    associated_bid_id: room.associated_bid_id,
    created_at: room.created_at,
    participants: (Array.isArray(room.room_participants) ? room.room_participants : [])
      .map((roomParticipant) => {
        const prof = asRecord(roomParticipant)?.profile;
        return normalizeProfile(prof);
      })
      .filter(Boolean) as Profile[],
  }));

  const mergedRooms = mergeRooms(remoteRooms, localRooms);
  remoteRooms.forEach((room) => rememberLocalRoom(normalizeRoom(room)));
  return mergedRooms;
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
  const currentUser = await getCurrentDataUser();

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
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `message-${Date.now()}`,
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
    window.dispatchEvent(
      new CustomEvent("eruka:chat-message", { detail: { message: localMessage } }),
    );
  }

  return localMessage;
}

function buildAcceptedBidRoom(bid: Bid, job: Job, roomId: string): Room {
  return {
    id: roomId,
    associated_bid_id: bid.id,
    created_at: new Date().toISOString(),
    participants: [
      participantProfile(job.recruiterId, job.recruiterName, "recruiter"),
      participantProfile(bid.freelancerId, bid.freelancerName, "freelancer"),
    ],
    title: job.title,
  };
}

function createLocalRoomForAcceptedBid(bid: Bid, job: Job): Room {
  const existingRoom = readLocalRooms().find((room) => room.associated_bid_id === bid.id);
  if (existingRoom) return existingRoom;

  const room = buildAcceptedBidRoom(bid, job, `room-${bid.id}-${Date.now()}`);
  rememberLocalRoom(room);

  return room;
}

async function fetchRemoteProfileByIdentity(profile: Profile): Promise<Profile | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const queries: Array<() => Promise<unknown>> = [];
  if (isUuid(profile.id)) {
    queries.push(async () => {
      const { data } = await supabase!
        .from("profiles")
        .select("id, name, email, role")
        .eq("id", profile.id)
        .maybeSingle();
      return data;
    });
  }
  if (profile.email) {
    queries.push(async () => {
      const { data } = await supabase!
        .from("profiles")
        .select("id, name, email, role")
        .eq("email", profile.email)
        .maybeSingle();
      return data;
    });
  }
  if (profile.name && profile.name !== "ERUKA User") {
    queries.push(async () => {
      const { data } = await supabase!
        .from("profiles")
        .select("id, name, email, role")
        .eq("name", profile.name)
        .maybeSingle();
      return data;
    });
  }

  for (const query of queries) {
    const normalized = normalizeProfile(await query());
    if (normalized) return normalized;
  }

  return null;
}

async function getAcceptedBidParticipants(bid: Bid, job: Job, currentUser: AuthUser) {
  const localParticipants = buildAcceptedBidRoom(bid, job, "preview").participants;

  return Promise.all(
    localParticipants.map(async (participant) => {
      if (profileMatchesUser(participant, currentUser)) {
        return profileFromUser(currentUser);
      }

      const remoteProfile = await fetchRemoteProfileByIdentity(participant);
      return remoteProfile || participant;
    }),
  );
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
      message.sender_id !== currentUser.id && new Date(message.created_at).getTime() > lastSeen,
  );
}

export async function acceptBidAndCreateRoom(bid: Bid, job: Job): Promise<string | null> {
  const currentUser = await getCurrentDataUser();
  if (!currentUser) return null;
  const participants = await getAcceptedBidParticipants(bid, job, currentUser);

  if (isSupabaseConfigured && supabase) {
    const { data: rpcRoomId, error: rpcError } = await supabase.rpc("accept_bid_and_create_room", {
      p_bid_id: bid.id,
    });

    if (!rpcError && rpcRoomId) {
      rememberLocalRoom({
        ...buildAcceptedBidRoom(bid, job, String(rpcRoomId)),
        participants,
      });
      await sendMessage({
        text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
        roomId: String(rpcRoomId),
      });

      return String(rpcRoomId);
    }

    if (rpcError && rpcError.code !== "PGRST202") {
      console.error("Error accepting bid through RPC, trying direct room creation:", rpcError);
    }

    const { data: roomData, error: roomError } = await supabase
      .from("rooms")
      .insert({ associated_bid_id: bid.id })
      .select("id")
      .single();

    if (roomError || !roomData) {
      console.error("Error creating room:", roomError);
    } else {
      const roomId = roomData.id;
      const remoteParticipants = participants
        .filter((participant) => isUuid(participant.id))
        .map((participant) => ({ room_id: roomId, profile_id: participant.id }));

      if (remoteParticipants.length < 2) {
        console.error(
          "Could not resolve both room participants to Supabase profiles, using local fallback.",
        );
      }

      const { error: participantError } =
        remoteParticipants.length >= 2
          ? await supabase
              .from("room_participants")
              .upsert(remoteParticipants, { onConflict: "room_id,profile_id" })
          : { error: new Error("Could not resolve room participants to Supabase profiles.") };

      if (!participantError && remoteParticipants.length >= 2) {
        rememberLocalRoom({
          ...buildAcceptedBidRoom(bid, job, roomId),
          participants,
        });
        await sendMessage({
          text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
          roomId: roomId,
        });

        return roomId;
      }

      console.error("Error adding room participants, using local fallback:", participantError);
    }
  }

  const localRoom = createLocalRoomForAcceptedBid(bid, job);
  await sendMessage({
    text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
    roomId: localRoom.id,
  });

  return localRoom.id;
}
