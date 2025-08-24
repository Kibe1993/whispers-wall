"use client";

import { useEffect, useRef, useState } from "react";
import { useTopic } from "@/library/context/TopicContext";
import { useUser } from "@clerk/nextjs";
import Pusher from "pusher-js";
import axios from "axios";
import styles from "./Chatpage.module.css";
import { Send, Upload } from "lucide-react";
import fallback from "../../public/WhispersLogo.png";
import Image from "next/image";
import WhisperActions from "../WhisperAction/WhisperActions";
import { Message, Reply } from "@/lib/interface/typescriptinterface";

// 🔄 Utility to deeply update replies (recursive)
function updateRepliesRecursively(replies: Reply[], updated: Message): Reply[] {
  return replies.map((r) =>
    r._id === updated._id
      ? { ...r, ...updated }
      : { ...r, replies: updateRepliesRecursively(r.replies || [], updated) }
  );
}

// 🔄 Replace or merge an updated message into the tree
function mergeUpdatedMessage(messages: Message[], updated: Message) {
  return messages.map((m) => {
    if (m._id === updated._id) {
      return { ...m, ...updated }; // root message updated
    }
    return {
      ...m,
      replies: updateRepliesRecursively(m.replies || [], updated),
    };
  });
}

// 🔄 Recursively remove a reply by ID
function removeReplyRecursively(replies: Reply[], id: string): Reply[] {
  return replies
    .filter((r) => r._id !== id)
    .map((r) => ({
      ...r,
      replies: removeReplyRecursively(r.replies || [], id),
    }));
}

export default function ChatPage() {
  const { activeTopic } = useTopic();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll effect
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch & subscribe to Pusher
  useEffect(() => {
    if (!activeTopic) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`/api/messages?topic=${activeTopic}`);
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

    // New messages (root only)
    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    // Updates (likes, edits, replies, dislikes, etc.)
    channel.bind("update-message", (updatedMsg: Message) => {
      setMessages((prev) => mergeUpdatedMessage(prev, updatedMsg));
    });

    // Deletions (root or nested)
    channel.bind(
      "delete-message",
      (data: { id: string; parentId: string | null }) => {
        setMessages((prev) => {
          if (!data.parentId) {
            // Case 1: root whisper deletion
            return prev.filter((m) => m._id !== data.id);
          }

          // Case 2: nested reply deletion
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

  // Detect user scroll (optional)
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // optional: could toggle auto-scroll here
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !activeTopic || !user) return;

    const newMessage = {
      message: input,
      topic: activeTopic,
      clerkId: user.id,
    };

    try {
      // ✅ Don’t update state here — Pusher will handle inserting
      await axios.post("/api/messages", newMessage);
      setInput("");
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <h2>Whisper Anything About {activeTopic}</h2>
      </div>

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className={`${styles.messages} ${
          messages.length === 0 ? styles.empty : ""
        }`}
      >
        {messages.length === 0 ? (
          <div className={styles.fallbackText}>
            <h3>No whispers yet for {activeTopic}</h3>
            <Image src={fallback} alt="Fallback Image" />
            <p>
              What is on your mind? With the most open community in the world
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isUser = msg.clerkId === user?.id;
            return (
              <div
                key={msg._id || idx}
                className={`${styles.message} ${
                  isUser ? styles.user : styles.other
                }`}
              >
                <WhisperActions
                  _id={msg._id}
                  message={msg.message}
                  clerkId={msg.clerkId}
                  likes={msg.likes || []}
                  dislikes={msg.dislikes || []}
                  replies={msg.replies || []}
                  topic={msg.topic}
                  createdAt={msg.createdAt}
                  onUpdate={(updatedMsg) => {
                    setMessages((prev) =>
                      mergeUpdatedMessage(prev, updatedMsg)
                    );
                  }}
                  onDelete={(id, parentId) => {
                    setMessages((prev) => {
                      if (!parentId) {
                        return prev.filter((m) => m._id !== id); // ✅ root delete
                      }
                      return prev.map((m) => ({
                        ...m,
                        replies: removeReplyRecursively(m.replies || [], id), // ✅ reply delete
                      }));
                    });
                  }}
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form
        className={styles.inputBar}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <button type="button" className={styles.uploadBtn}>
          <Upload size={20} />
        </button>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className={styles.sendBtn}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
