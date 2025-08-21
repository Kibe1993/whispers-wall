"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import styles from "./Chatpage.module.css";
import { Send, Upload } from "lucide-react";
import { useTopic } from "@/library/context/TopicContext";
import { useUser } from "@clerk/nextjs"; // 👈 import Clerk hook

interface Message {
  _id?: string;
  message: string;
  topic: string;
  clerkId?: string;
  createdAt?: string;
  sender?: "user" | "other"; // UI helper
}

export default function ChatPage() {
  const { activeTopic } = useTopic();
  const { user } = useUser(); // 👈 Clerk user
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  // Fetch existing messages when topic changes
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
  }, [activeTopic]);

  // Send new message
  const handleSend = async () => {
    if (!input.trim()) {
      console.warn("⚠️ Empty input, aborting");
      return;
    }
    if (!activeTopic) {
      return;
    }
    if (!user) {
      return;
    }

    const newMessage: Message = {
      message: input,
      topic: activeTopic,
      clerkId: user.id,
      sender: "user",
    };

    try {
      console.log("➡️ Posting to /api/messages with payload:", newMessage);
      const res = await axios.post("/api/messages", newMessage);

      setMessages((prev) => [...prev, res.data]); // append new message
      setInput(""); // clear input
    } catch (error) {
      console.error("❌ Error sending message:", error);
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <h2>Whisper Anything About {activeTopic}</h2>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, idx) => (
          <div
            key={msg._id || idx}
            className={`${styles.message} ${
              msg.clerkId === user?.id ? styles.user : styles.other
            }`}
          >
            {msg.message}
          </div>
        ))}
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
          onChange={(e) => {
            setInput(e.target.value);
          }}
        />
        <button type="submit" className={styles.sendBtn}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
