import { useEffect, useState, useRef, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import { subscribeToTyping, broadcastTyping } from "@/lib/chat";

/**
 * Hook to manage typing indicators.
 * Broadcasts when the current user is typing and shows when others are typing.
 */
export function useTyping(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<Map<string, { name: string; timeout: NodeJS.Timeout }>>(new Map());
  const lastBroadcastRef = useRef<number>(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!conversationId) return;

    const currentUser = getCurrentUser();

    const unsubscribe = subscribeToTyping(conversationId, (userId, userName) => {
      // Don't show our own typing indicator
      if (currentUser && userId === currentUser.id) return;

      setTypingUsers((prev) => {
        const next = new Map(prev);

        // Clear existing timeout for this user
        const existing = next.get(userId);
        if (existing) clearTimeout(existing.timeout);

        // Set a new timeout to remove this user after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers((p) => {
            const updated = new Map(p);
            updated.delete(userId);
            return updated;
          });
        }, 3000);

        next.set(userId, { name: userName, timeout });
        return next;
      });
    });

    return () => {
      unsubscribe();
      // Cleanup all timeouts
      setTypingUsers((prev) => {
        prev.forEach((entry) => clearTimeout(entry.timeout));
        return new Map();
      });
    };
  }, [conversationId]);

  const emitTyping = useCallback(() => {
    if (!conversationId) return;

    const currentUser = getCurrentUser();
    if (!currentUser) return;

    const now = Date.now();
    // Only broadcast every 2 seconds
    if (now - lastBroadcastRef.current < 2000) return;
    lastBroadcastRef.current = now;

    broadcastTyping(conversationId, currentUser.id, currentUser.name);

    // Reset debounce timer
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastBroadcastRef.current = 0;
    }, 3000);
  }, [conversationId]);

  const typingNames = Array.from(typingUsers.values()).map((t) => t.name);

  const typingText = typingNames.length === 0
    ? null
    : typingNames.length === 1
      ? `${typingNames[0]} is typing...`
      : typingNames.length === 2
        ? `${typingNames[0]} and ${typingNames[1]} are typing...`
        : `${typingNames[0]} and ${typingNames.length - 1} others are typing...`;

  return { typingText, typingNames, emitTyping };
}
