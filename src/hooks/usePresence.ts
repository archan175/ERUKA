import { useEffect, useState, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { trackPresence, subscribeToPresence, type Profile } from "@/lib/chat";

/**
 * Hook to manage user presence (online/offline status).
 * Tracks the current user as online and subscribes to presence updates
 * from other users.
 */
export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<Record<string, Profile>>({});
  const cleanupRef = useRef<(() => void) | null>(null);

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

    // Track self as online
    void trackPresence(profile).then((cleanup) => {
      cleanupRef.current = cleanup;
    });

    // Subscribe to others' presence
    const unsubPresence = subscribeToPresence((users) => {
      setOnlineUsers(users);
    });

    // Handle visibility change (mark offline when tab is hidden)
    const handleVisibility = () => {
      if (document.hidden) {
        cleanupRef.current?.();
      } else {
        void trackPresence(profile).then((cleanup) => {
          cleanupRef.current = cleanup;
        });
      }
    };

    // Handle before unload (mark offline)
    const handleBeforeUnload = () => {
      cleanupRef.current?.();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cleanupRef.current?.();
      unsubPresence();
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const isOnline = (userId: string) => Boolean(onlineUsers[userId]);

  return { onlineUsers, isOnline };
}
