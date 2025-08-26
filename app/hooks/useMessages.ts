"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Pusher from "pusher-js";
import { Message } from "@/lib/interface/typescriptinterface";
import {
  mergeUpdatedMessage,
  removeReplyRecursively,
} from "@/lib/utils/messageHelpers";

export function useMessages(activeTopic: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!activeTopic) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get<Message[]>(
          `/api/messages?topic=${activeTopic}`
        );
        setMessages(res.data);
      } catch (err) {
        console.error("❌ Failed to fetch messages:", err);
      }
    };

    fetchMessages();

    // ✅ Setup Pusher
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });

    const channel = pusher.subscribe(`topic-${activeTopic}`);

    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
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
  }, [activeTopic]);

  return { messages, setMessages };
}
