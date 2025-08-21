"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import styles from "./Chatpage.module.css";
import { Send, Upload } from "lucide-react";
import fallback from "../../public/WhispersLogo.png";
import { useTopic } from "@/library/context/TopicContext";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

interface Message {
  _id?: string;
  message: string;
  topic: string;
  clerkId?: string;
  createdAt?: string;
}

export default function ChatPage() {
  const { activeTopic } = useTopic();
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);

  // Auto-scroll effect
  useEffect(() => {
    if (isAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAutoScroll]);

  // Detect user scroll
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;
    setIsAutoScroll(scrollTop + clientHeight >= scrollHeight - 10);
  };

  // Fetch messages and poll
  useEffect(() => {
    if (!activeTopic) return;

    const fetchMessages = async () => {
      try {
        const res = await axios.get(`/api/messages?topic=${activeTopic}`);
        setMessages(res.data);
      } catch (error) {
        console.error("❌ Error fetching messages:", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);

    return () => clearInterval(interval);
  }, [activeTopic]);

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !activeTopic || !user) return;

    const newMessage: Message = {
      message: input,
      topic: activeTopic,
      clerkId: user.id,
    };

    try {
      const res = await axios.post("/api/messages", newMessage);
      setMessages((prev) => [...prev, res.data]);
      setInput("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
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
            <h3>No whispers yet for "{activeTopic}"</h3>
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
                {msg.message}
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
