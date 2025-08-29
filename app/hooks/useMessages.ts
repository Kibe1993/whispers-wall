"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import Pusher from "pusher-js";
import { Message } from "@/lib/interface/typescriptinterface";
import {
  mergeUpdatedMessage,
  removeReplyRecursively,
} from "@/lib/utils/messageHelpers";

export function useMessages(activeTopic: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 🚀 Track IDs we just sent, to avoid duplicate when Pusher broadcasts
  const justSentIds = useRef<Set<string>>(new Set());

  // 🔄 Expose a refresh function
  const refreshMessages = useCallback(async () => {
    if (!activeTopic) return;
    setIsLoading(true);
    try {
      const res = await axios.get<Message[]>(
        `/api/messages?topic=${activeTopic}`
      );
      setMessages(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch messages:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeTopic]);

  useEffect(() => {
    if (!activeTopic) return;
    refreshMessages();

    // ✅ Setup Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`topic-${activeTopic}`);

    channel.bind("new-message", (message: Message) => {
      if (justSentIds.current.has(message._id)) {
        // 🚀 skip first broadcast for locally sent msg
        justSentIds.current.delete(message._id);
        return;
      }

      setMessages((prev) => {
        const exists = prev.some((m) => m._id === message._id);
        return exists ? prev : [...prev, message];
      });
    });

    channel.bind("update-message", (updatedMsg: Message) => {
      setMessages((prev) => mergeUpdatedMessage(prev, updatedMsg));
    });

    channel.bind(
      "delete-message",
      (data: { id: string; parentId: string | null }) => {
        setMessages((prev) => {
          if (!data.parentId) {
            return prev.filter((m) => m._id !== data.id); // root deletion
          }
          return prev.map((m) => ({
            ...m,
            replies: removeReplyRecursively(m.replies || [], data.id),
          }));
        });
      }
    );

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [activeTopic, refreshMessages]);

  return { messages, setMessages, refreshMessages, isLoading, justSentIds };
}
