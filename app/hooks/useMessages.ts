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

  // Set up Pusher
  useEffect(() => {
    if (!activeTopic) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`topic-${activeTopic}`);

    channel.bind("new-message", (message: Message) => {
      if (justSentIds.current.has(message._id)) {
        justSentIds.current.delete(message._id);
        return;
      }

      queryClient.setQueryData<Message[]>(
        ["messages", activeTopic],
        (old = []) => {
          const exists = old.some((m) => m._id === message._id);
          return exists ? old : [...old, message];
        }
      );
    });

    channel.bind("update-message", (updatedMsg: Message) => {
      queryClient.setQueryData<Message[]>(
        ["messages", activeTopic],
        (old = []) => mergeUpdatedMessage(old, updatedMsg)
      );
    });

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

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [activeTopic, queryClient]);

  // Expose a manual refresh function
  const refreshMessages = () =>
    queryClient.invalidateQueries({ queryKey: ["messages", activeTopic] });

  return { messages, isLoading, refreshMessages, justSentIds };
}
