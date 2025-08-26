"use client";

import { useRef, useState } from "react";
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

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 🔑 force-remount key for the <input type="file">
  const [fileInputKey, setFileInputKey] = useState(0);

  // Send new message (with optional files)
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
      setFileInputKey((k) => k + 1); // 🔥 ensure same-file re-select works
    } catch (err) {
      console.error("❌ Failed to send message:", err);
    }
  };

  // Handle updating an existing message
  const handleUpdate = (updatedMsg: Message) => {
    setMessages((prev) => mergeUpdatedMessage(prev, updatedMsg));
  };

  // Handle deleting a message or nested reply
  const handleDelete = (id: string, parentId?: string | null) => {
    setMessages((prev) => {
      if (!parentId) {
        return prev.filter((m) => m._id !== id);
      }
      return prev.map((m) => ({
        ...m,
        replies: removeReplyRecursively(m.replies || [], id),
      }));
    });
  };

  // Trigger file input when clicking upload button
  const handleUploadClick = () => {
    // 🔄 clear value so picking the same file triggers onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) {
      // user canceled picker → clear and remount input
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setFileInputKey((k) => k + 1);
      return;
    }

    // set selected files
    setFiles(Array.from(list));

    // allow picking the same file again next time
    e.target.value = "";
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

      {/* File preview with cancel (above input bar) */}
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
                onClick={() =>
                  setFiles((prev) => {
                    const next = prev.filter((_, i) => i !== idx);
                    // if last item removed, reset input so same-file reselect works
                    if (next.length === 0) {
                      if (fileInputRef.current) fileInputRef.current.value = "";
                      setFileInputKey((k) => k + 1);
                    }
                    return next;
                  })
                }
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
        {/* Hidden file input */}
        <input
          key={fileInputKey} // 🔥 force-remount when we reset
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
