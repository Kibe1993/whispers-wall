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
import { Message } from "@/lib/interface/typescriptinterface";

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

  // Fetch initial messages when topic changes
  useEffect(() => {
    if (!activeTopic) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`/api/messages?topic=${activeTopic}`);
        setMessages(res.data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();

    // Pusher setup
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
    const channel = pusher.subscribe(`topic-${activeTopic}`);
    channel.bind("new-message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [activeTopic]);

  // Detect user scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    // optional: handle auto-scroll toggle
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
      const res = await axios.post("/api/messages", newMessage);
      setMessages((prev) => [...prev, res.data]);
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
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
                {/* WhisperActions renders the message and actions */}
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
                      prev.map((m) =>
                        m._id === updatedMsg._id ? updatedMsg : m
                      )
                    );
                  }}
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

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
