"use client";
import { useState } from "react";
import styles from "./Chatpage.module.css";
import { Send, Upload } from "lucide-react";
import { useTopic } from "@/library/context/TopicContext";

export default function ChatPage() {
  const { activeTopic } = useTopic();
  const [messages, setMessages] = useState<{ text: string; sender: string }[]>(
    []
  );
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage = { text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setTimeout(() => {
      const replyMessage = {
        text: `Reply to "${userMessage.text}"`,
        sender: "other",
      };
      setMessages((prev) => [...prev, replyMessage]);
    }, 1000);
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.header}>
        <h2>Whisper Anything About {activeTopic}</h2>
      </div>

      <div className={styles.messages}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`${styles.message} ${
              msg.sender === "user" ? styles.user : styles.other
            }`}
          >
            {msg.text}
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
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className={styles.sendBtn}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}
