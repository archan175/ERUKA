import { getCurrentDataUser, getCurrentUser, getRegisteredUsers, type AuthUser } from "./auth";
import type { Bid, Job } from "./mock-data";
import { isSupabaseConfigured, supabase } from "./supabase";

// ==============================================================================
// TYPES
// ==============================================================================

export type Profile = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_online?: boolean;
  last_seen?: string;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  conversation_id: string | null;
  text: string | null;
  image_url: string | null;
  voice_url: string | null;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_name: string | null;
  delivery_status: "sending" | "sent" | "delivered" | "read";
  reply_to: string | null;
  created_at: string;
  sender?: Profile;
};

export type Conversation = {
  id: string;
  type: "global" | "private";
  job_id: string | null;
  bid_id: string | null;
  client_id: string | null;
  freelancer_id: string | null;
  title: string | null;
  updated_at: string;
  created_at: string;
  members: Profile[];
  last_message?: ChatMessage | null;
  unread_count?: number;
};

export type ReadReceipt = {
  id: string;
  message_id: string;
  profile_id: string;
  read_at: string;
};

// ==============================================================================
// CONSTANTS
// ==============================================================================

const LOCAL_MESSAGES_KEY = "eruka_chat_messages_v2";
const LOCAL_CONVERSATIONS_KEY = "eruka_chat_conversations_v2";
const LAST_SEEN_PREFIX = "eruka_chat_last_seen_";
export const GLOBAL_CONVERSATION_ALIAS = "global";
export const GLOBAL_FALLBACK_CONVERSATION_ID = "00000000-0000-0000-0000-000000000000";

// Track message IDs we've already seen to prevent duplicates
const seenMessageIds = new Set<string>();
let globalConversationId: string | null = null;

// ==============================================================================
// HELPERS
// ==============================================================================

function isBrowser() {
  return typeof window !== "undefined";
}

function profileFromUser(user: AuthUser): Profile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function isUuid(value?: string | null) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
}

function sameIdentity(left?: string | null, right?: string | null) {
  if (!left || !right) return false;
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function isGenericSenderName(name?: string | null) {
  const normalized = name?.trim().toLowerCase();
  return !normalized || normalized === "eruka user" || normalized === "unknown" || normalized === "unknown user";
}

function nameFromEmail(email?: string | null) {
  const localPart = email?.trim().split("@")[0];
  if (!localPart) return "";

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function profileDisplayName(profile?: Profile | null, senderId?: string | null) {
  if (profile && !isGenericSenderName(profile.name)) return profile.name.trim();

  const emailName = nameFromEmail(profile?.email);
  if (emailName) return emailName;

  if (senderId && senderId.includes("@")) {
    const senderName = nameFromEmail(senderId);
    if (senderName) return senderName;
  }

  return "Unknown User";
}

function isGlobalConversationIdentifier(conversationId?: string | null) {
  return (
    conversationId === GLOBAL_CONVERSATION_ALIAS ||
    conversationId === GLOBAL_FALLBACK_CONVERSATION_ID ||
    Boolean(globalConversationId && conversationId === globalConversationId)
  );
}

function isLocalOnlyConversationId(conversationId?: string | null) {
  return (
    !conversationId ||
    conversationId === GLOBAL_CONVERSATION_ALIAS ||
    conversationId === GLOBAL_FALLBACK_CONVERSATION_ID ||
    !isUuid(conversationId)
  );
}

function localConversationIdsFor(conversationId: string): Set<string> {
  const conversationIds = new Set<string>([conversationId]);

  if (isGlobalConversationIdentifier(conversationId)) {
    conversationIds.add(GLOBAL_CONVERSATION_ALIAS);
    conversationIds.add(GLOBAL_FALLBACK_CONVERSATION_ID);
    if (globalConversationId) conversationIds.add(globalConversationId);
  }

  return conversationIds;
}

function normalizeProfile(row: unknown): Profile | null {
  const record = asRecord(row);
  if (!record?.id) return null;
  const email = stringValue(record.email);
  const name = stringValue(record.name);

  return {
    id: String(record.id),
    name: isGenericSenderName(name) ? nameFromEmail(email) || "Unknown User" : name,
    email,
    role: stringValue(record.role, "freelancer"),
    avatar_url: stringValue(record.avatar_url) || undefined,
    is_online: Boolean(record.is_online),
    last_seen: stringValue(record.last_seen) || undefined,
  };
}

function normalizeMessage(row: unknown): ChatMessage {
  const record = asRecord(row) || {};
  const conversationId = record.conversation_id ?? record.room_id ?? null;
  const senderId = String(record.sender_id ?? record.senderId);
  const sender = normalizeProfile(record.sender) || getSenderProfile(senderId) || undefined;

  return {
    id: String(record.id),
    sender_id: senderId,
    conversation_id: conversationId ? String(conversationId) : null,
    text: stringValue(record.text ?? record.message) || null,
    image_url: stringValue(record.image_url ?? record.imageUrl) || null,
    voice_url: stringValue(record.voice_url ?? record.voiceUrl) || null,
    attachment_url: stringValue(record.attachment_url) || null,
    attachment_type: stringValue(record.attachment_type) || null,
    attachment_name: stringValue(record.attachment_name) || null,
    delivery_status: (stringValue(record.delivery_status) || "sent") as ChatMessage["delivery_status"],
    reply_to: stringValue(record.reply_to) || null,
    created_at: stringValue(record.created_at ?? record.createdAt, new Date().toISOString()),
    sender,
  };
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

function deduplicateMessages(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  messages.forEach((msg) => {
    const existing = byId.get(msg.id);
    if (!existing || msg.sender) {
      byId.set(msg.id, msg);
    }
  });
  return sortMessages([...byId.values()]);
}

export function profileMatchesUser(profile: Profile, user: AuthUser) {
  if (!profile || !user) return false;
  return (
    sameIdentity(profile.id, user.id) ||
    sameIdentity(profile.id, user.email) ||
    sameIdentity(profile.email, user.email) ||
    sameIdentity(profile.email, user.id) ||
    sameIdentity(profile.name, user.name)
  );
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

export function getMessageSenderName(message: ChatMessage) {
  return profileDisplayName(message.sender || getSenderProfile(message.sender_id), message.sender_id);
}

// ==============================================================================
// LOCAL STORAGE HELPERS
// ==============================================================================

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

function readLocalMessagesForConversation(conversationId: string): ChatMessage[] {
  const conversationIds = localConversationIdsFor(conversationId);

  return readLocalMessages().filter(
    (message) => message.conversation_id && conversationIds.has(message.conversation_id),
  );
}

function readLocalConversations(): Conversation[] {
  if (!isBrowser()) return [];
  const raw = window.localStorage.getItem(LOCAL_CONVERSATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalConversations(conversations: Conversation[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(conversations));
}

function rememberLocalConversation(conversation: Conversation) {
  const conversations = readLocalConversations();
  const existing = conversations.findIndex((c) => c.id === conversation.id);
  if (existing >= 0) {
    conversations[existing] = conversation;
  } else {
    conversations.unshift(conversation);
  }
  writeLocalConversations(conversations);

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent("eruka:conversation-created", { detail: { conversation } }),
    );
  }
}

// ==============================================================================
// PROFILE FETCHING
// ==============================================================================

export async function fetchProfiles(): Promise<Profile[]> {
  const localProfiles = getRegisteredUsers().map(profileFromUser);

  if (!isSupabaseConfigured || !supabase) return localProfiles;

  const { data, error } = await supabase.from("profiles").select("id,name,email,role,avatar_url,is_online,last_seen");
  if (error || !data) {
    if (error) console.error("Error fetching profiles:", error);
    return localProfiles;
  }

  const remoteProfiles = data.map((profile) => ({
    id: String(profile.id),
    name: profile.name,
    email: profile.email,
    role: profile.role,
    avatar_url: profile.avatar_url || undefined,
    is_online: Boolean(profile.is_online),
    last_seen: profile.last_seen || undefined,
  }));

  const seen = new Set(remoteProfiles.map((p) => p.id));
  return [...remoteProfiles, ...localProfiles.filter((p) => !seen.has(p.id))];
}

// ==============================================================================
// GLOBAL CONVERSATION
// ==============================================================================

export async function getGlobalConversationId(): Promise<string | null> {
  if (globalConversationId) return globalConversationId;

  if (!isSupabaseConfigured || !supabase) {
    globalConversationId = GLOBAL_FALLBACK_CONVERSATION_ID;
    return globalConversationId;
  }

  // Try RPC first
  const { data, error } = await supabase.rpc("get_or_create_global_conversation");
  if (!error && data) {
    globalConversationId = String(data);
    return globalConversationId;
  }

  // Fallback: query directly
  const { data: convData } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", "global")
    .limit(1)
    .maybeSingle();

  if (convData) {
    globalConversationId = convData.id;
    return globalConversationId;
  }

  // If we still don't have it, try to create it directly from the frontend
  try {
    const { data: newConv } = await supabase
      .from("conversations")
      .insert([{ type: "global", title: "Global Chat" }])
      .select("id")
      .single();

    if (newConv) {
      globalConversationId = newConv.id;
      return globalConversationId;
    }
  } catch (e) {
    console.warn("Failed to create global conversation directly", e);
  }

  // Last resort: use the local global room for this call, but do not cache it
  // while Supabase is configured so a later retry can recover the remote room.
  return GLOBAL_FALLBACK_CONVERSATION_ID;
}

// ==============================================================================
// CONVERSATION FETCHING
// ==============================================================================

export async function fetchUserConversations(): Promise<Conversation[]> {
  const localConversations = readLocalConversations();
  if (!isSupabaseConfigured || !supabase) return localConversations;

  const { data: sessionData } = await supabase.auth.getUser();
  const authUid = sessionData?.user?.id;
  if (!authUid) return localConversations;

  const ensuredGlobalId = await getGlobalConversationId();

  // Get conversation IDs the user is a member of
  const { data: memberData, error: mError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("profile_id", authUid);

  if (mError || !memberData) return localConversations;

  const conversationIds = memberData.map((m) => m.conversation_id);

  // Also include global conversations
  const { data: globalData } = await supabase
    .from("conversations")
    .select("id")
    .eq("type", "global");

  const globalIds = (globalData || []).map((c) => c.id);
  if (
    ensuredGlobalId &&
    ensuredGlobalId !== GLOBAL_CONVERSATION_ALIAS &&
    ensuredGlobalId !== GLOBAL_FALLBACK_CONVERSATION_ID
  ) {
    globalIds.push(ensuredGlobalId);
  }
  const allIds = [...new Set([...conversationIds, ...globalIds])];

  if (allIds.length === 0) return localConversations;

  // Fetch conversations with members
  const { data: convsData, error: cError } = await supabase
    .from("conversations")
    .select(`
      id,
      type,
      job_id,
      bid_id,
      client_id,
      freelancer_id,
      title,
      updated_at,
      created_at,
      conversation_members (
        profile:profiles(id, name, email, role, avatar_url, is_online, last_seen)
      )
    `)
    .in("id", allIds)
    .order("updated_at", { ascending: false });

  if (cError || !convsData) return localConversations;

  // Fetch last message for each conversation
  const conversations: Conversation[] = await Promise.all(
    convsData.map(async (conv) => {
      if (conv.type === "global") {
        globalConversationId = conv.id;
      }

      const members = (Array.isArray(conv.conversation_members) ? conv.conversation_members : [])
        .map((cm: any) => {
          const prof = asRecord(cm)?.profile;
          return normalizeProfile(prof);
        })
        .filter(Boolean) as Profile[];

      // Get last message
      const { data: lastMsgData } = await supabase!
        .from("messages")
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get unread count
      const { count: unreadCount } = await supabase!
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", conv.id)
        .neq("sender_id", authUid)
        .not("id", "in", `(select message_id from read_receipts where profile_id = '${authUid}')`);

      return {
        id: conv.id,
        type: conv.type as "global" | "private",
        job_id: conv.job_id,
        bid_id: conv.bid_id,
        client_id: conv.client_id,
        freelancer_id: conv.freelancer_id,
        title: conv.title,
        updated_at: conv.updated_at,
        created_at: conv.created_at,
        members,
        last_message: lastMsgData ? normalizeMessage(lastMsgData) : null,
        unread_count: unreadCount || 0,
      };
    }),
  );

  // Cache locally
  conversations.forEach((c) => rememberLocalConversation(c));

  return conversations;
}

// ==============================================================================
// MESSAGE FETCHING
// ==============================================================================

export async function fetchMessages(conversationId: string | null = null): Promise<ChatMessage[]> {
  if (!conversationId) return [];

  const resolvedConversationId =
    conversationId === GLOBAL_CONVERSATION_ALIAS ? await getGlobalConversationId() : conversationId;

  if (!resolvedConversationId) return [];

  const localMessages = readLocalMessagesForConversation(resolvedConversationId);

  if (!isSupabaseConfigured || !supabase || isLocalOnlyConversationId(resolvedConversationId)) {
    return deduplicateMessages(localMessages);
  }

  const query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", resolvedConversationId)
    .order("created_at", { ascending: true })
    .limit(200);

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("Error fetching messages:", error);
    return deduplicateMessages(localMessages);
  }

  // Fetch sender profiles
  const senderIds = [...new Set(
    data.map((m: any) => asRecord(m)?.sender_id).filter((id): id is string => typeof id === "string"),
  )];

  const profilesMap: Record<string, Profile> = {};
  if (senderIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, name, email, role, avatar_url, is_online, last_seen")
      .in("id", senderIds);

    if (profileData) {
      profileData.forEach((p) => {
        const profile = normalizeProfile(p);
        if (profile) profilesMap[profile.id] = profile;
      });
    }
  }

  const messages = data.map((msg: any) => {
    const record = asRecord(msg) || {};
    const senderId = String(record.sender_id || "");
    return normalizeMessage({
      ...record,
      sender: profilesMap[senderId] || getSenderProfile(senderId) || undefined,
    });
  });

  // Add to seen set
  messages.forEach((m) => seenMessageIds.add(m.id));

  return deduplicateMessages([...localMessages, ...messages]);
}

export async function fetchInboxMessages(): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return readLocalMessages();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(500);

  if (error || !data) return readLocalMessages();

  return data.map(normalizeMessage);
}

// ==============================================================================
// SENDING MESSAGES
// ==============================================================================

export async function uploadChatMedia(file: File, type: "image" | "voice" | "document"): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const ext = file.name.split(".").pop() || (type === "voice" ? "webm" : "bin");
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const folder = type === "document" ? "documents" : type === "image" ? "images" : "voices";
    const filePath = `${folder}/${fileName}`;

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

  // Fallback to data URL for images
  if (type === "image") {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }

  return null;
}

export async function sendMessage({
  text,
  conversationId,
  imageUrl,
  voiceUrl,
  attachmentUrl,
  attachmentType,
  attachmentName,
}: {
  text?: string;
  conversationId?: string | null;
  imageUrl?: string | null;
  voiceUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
}) {
  const cleanText = text?.trim() || null;
  const currentUser = await getCurrentDataUser();
  const targetConversationId =
    conversationId === GLOBAL_CONVERSATION_ALIAS
      ? await getGlobalConversationId()
      : conversationId || null;

  if (isSupabaseConfigured && supabase && !isLocalOnlyConversationId(targetConversationId)) {
    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData.user;

    if (authUser) {
      const profile: Profile = {
        id: authUser.id,
        name:
          currentUser?.name ||
          authUser.user_metadata?.name ||
          authUser.user_metadata?.full_name ||
          nameFromEmail(authUser.email) ||
          "Unknown User",
        email: currentUser?.email || authUser.email || "",
        role: currentUser?.role || authUser.user_metadata?.role || "freelancer",
        avatar_url: currentUser?.avatar_url || authUser.user_metadata?.avatar_url || undefined,
      };

      await supabase.from("profiles").upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatar_url || null,
      });

      const { data, error } = await supabase
        .from("messages")
        .insert([
          {
            sender_id: authUser.id,
            conversation_id: targetConversationId,
            text: cleanText,
            image_url: imageUrl || null,
            voice_url: voiceUrl || null,
            attachment_url: attachmentUrl || null,
            attachment_type: attachmentType || null,
            attachment_name: attachmentName || null,
            delivery_status: "sent",
          },
        ])
        .select("*")
        .single();

      if (!error && data) {
        const message = normalizeMessage({
          ...data,
          sender: profile,
        });
        seenMessageIds.add(message.id);
        return message;
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
    conversation_id: targetConversationId,
    text: cleanText,
    image_url: imageUrl || null,
    voice_url: voiceUrl || null,
    attachment_url: attachmentUrl || null,
    attachment_type: attachmentType || null,
    attachment_name: attachmentName || null,
    delivery_status: "sent",
    reply_to: null,
    created_at: new Date().toISOString(),
    sender: profileFromUser(currentUser),
  };

  writeLocalMessages([...readLocalMessages(), localMessage]);
  seenMessageIds.add(localMessage.id);

  if (isBrowser()) {
    window.dispatchEvent(
      new CustomEvent("eruka:chat-message", { detail: { message: localMessage } }),
    );
  }

  return localMessage;
}

// ==============================================================================
// READ RECEIPTS
// ==============================================================================

export async function markMessagesAsRead(conversationId: string) {
  if (!isSupabaseConfigured || !supabase) return;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return;
  const profileId = userData.user.id;

  // Get all unread messages in this conversation that the current user didn't send
  const { data: unreadMessages } = await supabase
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId)
    .neq("sender_id", profileId);

  if (!unreadMessages || unreadMessages.length === 0) return;

  // Insert read receipts (ignoring conflicts)
  const receipts = unreadMessages.map((msg) => ({
    message_id: msg.id,
    profile_id: profileId,
  }));

  await supabase
    .from("read_receipts")
    .upsert(receipts, { onConflict: "message_id,profile_id" });

  // Update delivery status on messages
  await supabase
    .from("messages")
    .update({ delivery_status: "read" })
    .eq("conversation_id", conversationId)
    .neq("sender_id", profileId);
}

// ==============================================================================
// REALTIME SUBSCRIPTIONS
// ==============================================================================

// Channel type for ref-counted singleton/per-conversation subscriptions
type ChannelSub<T extends (...args: any[]) => void> = {
  channel: ReturnType<NonNullable<typeof supabase>["channel"]>;
  listeners: Array<T>;
};

// --- Global chat: singleton channel "global-chat" ---
let globalChatSub: ChannelSub<(msg: ChatMessage) => void> | null = null;

// --- Private chat: per-conversation channel "private:{conversationId}" ---
const privateChatSubs = new Map<string, ChannelSub<(msg: ChatMessage) => void>>();

/**
 * Builds the Supabase postgres_changes callback shared by global-chat and
 * private channels.  The `getSub` thunk lets the callback look up the
 * current listener list at invocation time (not capture time).
 */
function makeMessageHandler(
  getSub: () => ChannelSub<(msg: ChatMessage) => void> | null | undefined,
) {
  return async (payload: any) => {
    let sender: Profile | undefined;
    const { data: senderData, error: senderError } = await supabase!
      .from("profiles")
      .select("id, name, email, role, avatar_url, is_online, last_seen")
      .eq("id", payload.new.sender_id)
      .single();

    if (senderError) {
      console.error(`[Chat] Error fetching sender profile for ID ${payload.new.sender_id}:`, senderError);
    } else if (senderData) {
      sender = normalizeProfile(senderData) || undefined;
    }

    const msg = normalizeMessage({ ...payload.new, sender });
    const sub = getSub();
    if (sub) {
      sub.listeners.forEach((l) => l(msg));
    }
  };
}

/**
 * Ensures the singleton "global-chat" channel exists and is subscribed.
 * Returns a reference so callers can add their listener.
 */
function ensureGlobalChatChannel(resolvedGlobalId: string): ChannelSub<(msg: ChatMessage) => void> {
  if (globalChatSub) return globalChatSub;

  const channelId = "global-chat";
  console.log(`[Chat] Creating channel: ${channelId} (conversation_id=${resolvedGlobalId})`);

  const channel = supabase!
    .channel(channelId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${resolvedGlobalId}`,
      },
      makeMessageHandler(() => globalChatSub),
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Chat] Subscribed to channel: ${channelId}`);
      }
      if (status === "CHANNEL_ERROR" || err) {
        console.error(`[Chat] Channel error on ${channelId}:`, err || "Unknown error");
      }
    });

  globalChatSub = { channel, listeners: [] };
  return globalChatSub;
}

/**
 * Ensures a "private:{conversationId}" channel exists and is subscribed.
 */
function ensurePrivateChatChannel(conversationId: string): ChannelSub<(msg: ChatMessage) => void> {
  const channelId = `private:${conversationId}`;
  let sub = privateChatSubs.get(channelId);
  if (sub) return sub;

  console.log(`[Chat] Creating channel: ${channelId}`);

  const channel = supabase!
    .channel(channelId)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      makeMessageHandler(() => privateChatSubs.get(channelId)),
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Chat] Subscribed to channel: ${channelId}`);
      }
      if (status === "CHANNEL_ERROR" || err) {
        console.error(`[Chat] Channel error on ${channelId}:`, err || "Unknown error");
      }
    });

  sub = { channel, listeners: [] };
  privateChatSubs.set(channelId, sub);
  return sub;
}

export function subscribeToMessages(
  conversationId: string,
  onMessage: (msg: ChatMessage) => void,
) {
  console.log(`[Chat] subscribeToMessages called for: ${conversationId}`);
  const unsubscribers: Array<() => void> = [];
  const localConversationIds = localConversationIdsFor(conversationId);

  // --- Local (non-Supabase) listener for optimistic / offline messages ---
  if (isBrowser()) {
    const onLocalMessage = (event: Event) => {
      const message = (event as CustomEvent<{ message: ChatMessage }>).detail?.message;
      if (!message) return;
      if (!message.conversation_id || !localConversationIds.has(message.conversation_id)) return;
      onMessage(message);
    };

    window.addEventListener("eruka:chat-message", onLocalMessage);
    unsubscribers.push(() => window.removeEventListener("eruka:chat-message", onLocalMessage));
  }

  // --- Supabase realtime channel ---
  if (isSupabaseConfigured && supabase && !isLocalOnlyConversationId(conversationId)) {
    const isGlobal = isGlobalConversationIdentifier(conversationId);

    if (isGlobal) {
      // Global chat → singleton "global-chat" channel
      const sub = ensureGlobalChatChannel(conversationId);
      sub.listeners.push(onMessage);

      unsubscribers.push(() => {
        sub.listeners = sub.listeners.filter((l) => l !== onMessage);
        if (sub.listeners.length === 0 && globalChatSub) {
          console.log("[Chat] Removing channel: global-chat");
          void supabase!.removeChannel(globalChatSub.channel);
          globalChatSub = null;
        }
      });
    } else {
      // Private chat → "private:{conversationId}" channel
      const channelId = `private:${conversationId}`;
      const sub = ensurePrivateChatChannel(conversationId);
      sub.listeners.push(onMessage);

      unsubscribers.push(() => {
        sub.listeners = sub.listeners.filter((l) => l !== onMessage);
        if (sub.listeners.length === 0) {
          console.log(`[Chat] Removing channel: ${channelId}`);
          void supabase!.removeChannel(sub.channel);
          privateChatSubs.delete(channelId);
        }
      });
    }
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// Subscribe to ALL messages for notification purposes (Header.tsx).
// Reuses the "global-chat" singleton so we don't create a redundant channel.
export function subscribeToAllMessages(onMessage: (msg: ChatMessage) => void) {
  const unsubscribers: Array<() => void> = [];

  // Local event listener for optimistic / offline messages
  if (isBrowser()) {
    const onLocalMessage = (event: Event) => {
      const message = (event as CustomEvent<{ message: ChatMessage }>).detail?.message;
      if (!message) return;
      onMessage(message);
    };

    window.addEventListener("eruka:chat-message", onLocalMessage);
    unsubscribers.push(() => window.removeEventListener("eruka:chat-message", onLocalMessage));
  }

  // Reuse the global-chat channel for cross-cutting notifications.
  // This requires the global conversation ID to be resolved first.
  if (isSupabaseConfigured && supabase) {
    let attached = false;

    // The global conversation ID may already be cached from a prior call.
    // If not, resolve it asynchronously and attach once ready.
    void getGlobalConversationId().then((resolvedId) => {
      if (!resolvedId || isLocalOnlyConversationId(resolvedId)) return;

      const sub = ensureGlobalChatChannel(resolvedId);
      sub.listeners.push(onMessage);
      attached = true;
    });

    unsubscribers.push(() => {
      if (attached && globalChatSub) {
        globalChatSub.listeners = globalChatSub.listeners.filter((l) => l !== onMessage);
        if (globalChatSub.listeners.length === 0) {
          console.log("[Chat] Removing channel: global-chat (from subscribeToAllMessages cleanup)");
          void supabase!.removeChannel(globalChatSub.channel);
          globalChatSub = null;
        }
      }
    });
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}

// ==============================================================================
// TYPING INDICATORS
// ==============================================================================

const typingSubscriptions = new Map<string, ChannelSub<(userId: string, userName: string) => void>>();

export function subscribeToTyping(
  conversationId: string,
  onTyping: (userId: string, userName: string) => void,
) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  const channelId = `typing:${conversationId}`;

  let sub = typingSubscriptions.get(channelId);

  if (!sub) {
    console.log(`[Chat] Creating channel: ${channelId}`);
    const channel = supabase
      .channel(channelId)
      .on("broadcast", { event: "typing" }, (payload) => {
        const { userId, userName } = payload.payload as { userId: string; userName: string };
        const currentSub = typingSubscriptions.get(channelId);
        if (currentSub) {
          currentSub.listeners.forEach((l) => l(userId, userName));
        }
      })
      .subscribe();

    sub = { channel, listeners: [] };
    typingSubscriptions.set(channelId, sub);
  }

  sub.listeners.push(onTyping);

  return () => {
    const currentSub = typingSubscriptions.get(channelId);
    if (currentSub) {
      currentSub.listeners = currentSub.listeners.filter((l) => l !== onTyping);
      if (currentSub.listeners.length === 0) {
        console.log(`[Chat] Removing channel: ${channelId}`);
        void supabase!.removeChannel(currentSub.channel);
        typingSubscriptions.delete(channelId);
      }
    }
  };
}

export function broadcastTyping(conversationId: string, userId: string, userName: string) {
  if (!isSupabaseConfigured || !supabase) return;

  const channelId = `typing:${conversationId}`;
  const sub = typingSubscriptions.get(channelId);
  if (!sub) return; // No active typing subscription — nothing to broadcast on

  sub.channel.send({
    type: "broadcast",
    event: "typing",
    payload: { userId, userName },
  });
}

// ==============================================================================
// PRESENCE / ONLINE STATUS
// ==============================================================================

let presenceChannel: ReturnType<NonNullable<typeof supabase>["channel"]> | null = null;
let presenceListeners: Array<(onlineUsers: Record<string, Profile>) => void> = [];
let onlineUsersCache: Record<string, Profile> = {};

export function trackPresence(user: Profile, onPresenceChange: (onlineUsers: Record<string, Profile>) => void) {
  if (!isSupabaseConfigured || !supabase) return () => {};

  presenceListeners.push(onPresenceChange);
  onPresenceChange(onlineUsersCache);

  if (!presenceChannel) {
    const channelId = "online-users";
    console.log(`[Chat] Creating channel: ${channelId} (presence only)`);

    presenceChannel = supabase.channel(channelId, {
      config: { presence: { key: "user" } },
    });

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        if (!presenceChannel) return;
        const state = presenceChannel.presenceState<{ user: Profile }>();
        const onlineUsers: Record<string, Profile> = {};
        Object.values(state).forEach((presences) => {
          presences.forEach((p: any) => {
            if (p.user?.id) {
              onlineUsers[p.user.id] = p.user;
            }
          });
        });
        onlineUsersCache = onlineUsers;
        presenceListeners.forEach((l) => l(onlineUsers));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && presenceChannel) {
          await presenceChannel.track({ user });
        }
      });

    // Also update DB
    void supabase.rpc("update_user_presence", { p_is_online: true });
  }

  return () => {
    presenceListeners = presenceListeners.filter((l) => l !== onPresenceChange);

    if (presenceListeners.length === 0 && presenceChannel) {
      console.log("[Chat] Removing channel: online-users");
      void presenceChannel.untrack();
      void supabase!.removeChannel(presenceChannel);
      void supabase!.rpc("update_user_presence", { p_is_online: false });
      presenceChannel = null;
      onlineUsersCache = {};
    }
  };
}

// ==============================================================================
// CHAT LAST SEEN / UNREAD
// ==============================================================================

export function getChatLastSeen(userId = getCurrentUser()?.id) {
  if (!isBrowser() || !userId) return 0;
  return Number(window.localStorage.getItem(`${LAST_SEEN_PREFIX}${userId}`) || 0);
}

export function markChatSeen(userId = getCurrentUser()?.id) {
  if (!isBrowser() || !userId) return;
  window.localStorage.setItem(`${LAST_SEEN_PREFIX}${userId}`, String(Date.now()));
  window.dispatchEvent(new CustomEvent("eruka:chat-seen", { detail: { userId } }));
}

export async function fetchUnreadCount(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 0;

  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user?.id) return 0;

  const profileId = userData.user.id;

  // Count messages the user hasn't read and didn't send
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", profileId)
    .not("id", "in",
      `(select message_id from read_receipts where profile_id = '${profileId}')`
    );

  if (error) return 0;
  return count || 0;
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

// ==============================================================================
// BID ACCEPTANCE & CONVERSATION CREATION
// ==============================================================================

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
    name: user?.name || name || nameFromEmail(id) || "Unknown User",
    email: user?.email || (id.includes("@") ? id : ""),
    role: user?.role || role,
    avatar_url: user?.avatar_url,
  };
}

export async function acceptBidAndCreateRoom(bid: Bid, job: Job): Promise<string | null> {
  const currentUser = await getCurrentDataUser();
  if (!currentUser) return null;

  if (isSupabaseConfigured && supabase) {
    // Try the new RPC first
    const { data: rpcId, error: rpcError } = await supabase.rpc("accept_bid_and_create_conversation", {
      p_bid_id: bid.id,
    });

    if (!rpcError && rpcId) {
      const conversationId = String(rpcId);

      // Cache locally
      rememberLocalConversation({
        id: conversationId,
        type: "private",
        job_id: job.id,
        bid_id: bid.id,
        client_id: currentUser.id,
        freelancer_id: bid.freelancerId,
        title: job.title,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        members: [
          participantProfile(currentUser.id, currentUser.name, "recruiter"),
          participantProfile(bid.freelancerId, bid.freelancerName, "freelancer"),
        ],
      });

      await sendMessage({
        text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
        conversationId,
      });

      return conversationId;
    }

    if (rpcError) {
      // Fallback to old function name
      const { data: oldRpcId, error: oldRpcError } = await supabase.rpc("accept_bid_and_create_room", {
        p_bid_id: bid.id,
      });

      if (!oldRpcError && oldRpcId) {
        const conversationId = String(oldRpcId);
        rememberLocalConversation({
          id: conversationId,
          type: "private",
          job_id: job.id,
          bid_id: bid.id,
          client_id: currentUser.id,
          freelancer_id: bid.freelancerId,
          title: job.title,
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          members: [
            participantProfile(currentUser.id, currentUser.name, "recruiter"),
            participantProfile(bid.freelancerId, bid.freelancerName, "freelancer"),
          ],
        });

        await sendMessage({
          text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
          conversationId,
        });

        return conversationId;
      }

      console.error("Error accepting bid:", rpcError, oldRpcError);
    }
  }

  // Local fallback
  const localConversationId = `conv-${bid.id}-${Date.now()}`;
  rememberLocalConversation({
    id: localConversationId,
    type: "private",
    job_id: job.id,
    bid_id: bid.id,
    client_id: currentUser.id,
    freelancer_id: bid.freelancerId,
    title: job.title,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    members: [
      participantProfile(currentUser.id, currentUser.name, "recruiter"),
      participantProfile(bid.freelancerId, bid.freelancerName, "freelancer"),
    ],
  });

  await sendMessage({
    text: `Your proposal for "${job.title}" was accepted. Let's align on the first milestone.`,
    conversationId: localConversationId,
  });

  return localConversationId;
}

// ==============================================================================
// BACKWARD COMPATIBILITY (for Header.tsx etc.)
// ==============================================================================

// Alias old Room type for backward compatibility
export type Room = Conversation;

export async function fetchUserRooms(): Promise<Conversation[]> {
  return fetchUserConversations();
}
