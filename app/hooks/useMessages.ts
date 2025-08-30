"use client";

import { useRef, useEffect } from "react";
import axios from "axios";
import Pusher from "pusher-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Message } from "@/lib/interface/typescriptinterface";
import {
  mergeUpdatedMessage,
  removeReplyRecursively,
} from "@/lib/utils/messageHelpers";

export function useMessages(activeTopic: string | null) {
  const queryClient = useQueryClient();
  const justSentIds = useRef<Set<string>>(new Set());

  // Fetch messages from the server
  const fetchMessages = async (): Promise<Message[]> => {
    if (!activeTopic) return [];
    const res = await axios.get<Message[]>(
      `/api/messages?topic=${activeTopic}`
    );
    return res.data;
  };

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["messages", activeTopic],
    queryFn: fetchMessages,
    enabled: !!activeTopic,
  });

  // Set up Pusher for real-time updates
  useEffect(() => {
    if (!activeTopic) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`topic-${activeTopic}`);

    // New message handler
    channel.bind("new-message", (message: Message) => {
      queryClient.setQueryData<Message[]>(
        ["messages", activeTopic],
        (old = []) => {
          // If this message was just sent locally, replace the optimistic one
          const idx = old.findIndex((m) => justSentIds.current.has(m._id));
          if (idx >= 0) {
            justSentIds.current.delete(old[idx]._id);
            const newArr = [...old];
            newArr[idx] = message;
            return newArr;
          }

          // If message already exists, do nothing
          if (old.some((m) => m._id === message._id)) return old;

          // Otherwise, add new message
          return [...old, message];
        }
      );
    });

    // Message update handler
    channel.bind("update-message", (updatedMsg: Message) => {
      queryClient.setQueryData<Message[]>(
        ["messages", activeTopic],
        (old = []) => mergeUpdatedMessage(old, updatedMsg)
      );
    });

    // Message delete handler
    channel.bind(
      "delete-message",
      (data: { id: string; parentId: string | null }) => {
        queryClient.setQueryData<Message[]>(
          ["messages", activeTopic],
          (old = []) => {
            if (!data.parentId) {
              return old.filter((m) => m._id !== data.id);
            }
            return old.map((m) => ({
              ...m,
              replies: removeReplyRecursively(m.replies || [], data.id),
            }));
          }
        );
      }
    );

    // Cleanup
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [activeTopic, queryClient]);

  // Manual refresh
  const refreshMessages = () =>
    queryClient.invalidateQueries({ queryKey: ["messages", activeTopic] });

  return { messages, isLoading, refreshMessages, justSentIds };
}
