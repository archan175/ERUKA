import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { trackPresence, type Profile } from "@/lib/chat";

/**
 * Hook to manage user presence (online/offline status).
 * Tracks the current user as online and subscribes to presence updates
 * from other users.
 */
export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, Profile>>({});

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const profile: Profile = {
      id: currentUser.id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      avatar_url: currentUser.avatar_url,
    };

    // This single function now handles subscribing to presence changes
    // and tracking the current user's online status.
    const cleanup = trackPresence(profile, (users) => {
      setOnlineUsers(users);
    });

    // The returned cleanup function will handle untracking,
    // unsubscribing, and marking the user as offline.
    return () => {
      cleanup();
    };
  }, []);

  const isOnline = (userId: string) => Boolean(onlineUsers[userId]);

  return { onlineUsers, isOnline };
}
