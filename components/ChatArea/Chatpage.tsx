"use client";

import { useRef, useState, useEffect } from "react";
import { useTopic } from "@/library/context/TopicContext";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import styles from "./Chatpage.module.css";
import { Send, Upload } from "lucide-react";
import fallback from "../../public/WhispersLogo.png";
import Image from "next/image";
import WhisperActions from "../WhisperAction/WhisperActions";
import { Message } from "@/lib/interface/typescriptinterface";
import {
  mergeUpdatedMessage,
  removeReplyRecursively,
} from "@/lib/utils/messageHelpers";
import { useMessages } from "@/app/hooks/useMessages";

export default function ChatPage() {
  const { activeTopic } = useTopic();
  const { user } = useUser();
  const { messages, setMessages } = useMessages(activeTopic);

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [autoScroll, setAutoScroll] = useState(true);

  // 👇 track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const threshold = 100;
      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        threshold;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // 👇 Improved auto-scroll effect
  useEffect(() => {
    if (!messagesEndRef.current) return;

    // Always scroll to bottom on initial load
    if (isInitialLoad && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        setIsInitialLoad(false);
      }, 100);
      return;
    }

    // Only auto-scroll if user is at bottom or it's a new message
    if (autoScroll) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, autoScroll, isInitialLoad]);

  // 👇 send new message
  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || !activeTopic || !user) return;

    const formData = new FormData();
    formData.append("message", input);
    formData.append("topic", activeTopic);
    formData.append("clerkId", user.id);

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      await axios.post("/api/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setInput("");
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    }
  };

  // 👇 update / delete helpers
  const handleUpdate = (updatedMsg: Message) => {
    setMessages((prev) => mergeUpdatedMessage(prev, updatedMsg));
  };

  const handleDelete = (id: string, parentId?: string | null) => {
    setMessages((prev) => {
      if (!parentId) return prev.filter((m) => m._id !== id);
      return prev.map((m) => ({
        ...m,
        replies: removeReplyRecursively(m.replies || [], id),
      }));
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    // Append new files to existing ones
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  // Add a function to properly remove files
  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));

    // Reset the file input to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Whisper Anything About {activeTopic}</h2>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} className={styles.messages}>
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
                  files={msg.files || []}
                  topic={msg.topic}
                  createdAt={msg.createdAt}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {files.length > 0 && (
        <div className={styles.filePreview}>
          {files.map((file, idx) => (
            <div key={idx} className={styles.fileItem}>
              {file.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className={styles.thumbnail}
                />
              ) : file.type.startsWith("video/") ? (
                <video
                  controls
                  className={styles.thumbnail}
                  src={URL.createObjectURL(file)}
                />
              ) : (
                <div className={styles.fileIcon}>📄</div>
              )}

              <span className={styles.fileName}>{file.name}</span>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => handleRemoveFile(idx)}
              >
                ✖
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form
        className={styles.inputBar}
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: "none" }}
          multiple
          accept="image/*,video/*,.pdf"
          onChange={handleFileChange}
        />

        <button
          type="button"
          className={styles.uploadBtn}
          onClick={handleUploadClick}
        >
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
