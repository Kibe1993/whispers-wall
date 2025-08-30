"use client";

import { useRef, useState, useEffect } from "react";
import { useTopic } from "@/library/context/TopicContext";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import styles from "./Chatpage.module.css";
import { Send, Upload } from "lucide-react";
import fallback from "../../public/WhispersLogo.png";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import WhisperActions from "../WhisperAction/WhisperActions";
import { Message, PreviewFile } from "@/lib/interface/typescriptinterface";
import { useMessages } from "@/app/hooks/useMessages";
import { useQueryClient } from "@tanstack/react-query";

export default function ChatPage() {
  const { activeTopic } = useTopic();
  const { user } = useUser();
  const { messages, isLoading, justSentIds } = useMessages(activeTopic);

  const queryClient = useQueryClient();

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const lastMessageCountRef = useRef(0); // Track message count changes

  // Scroll tracking
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

  // Auto-scroll effect - FIXED
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if new messages were added
    const hasNewMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    // On first load, scroll to bottom immediately
    if (isInitialLoad && !isLoading && messages.length > 0) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
      setIsInitialLoad(false);
      return;
    }

    // Scroll to bottom if auto-scroll is enabled AND new messages were added
    if (autoScroll && hasNewMessages) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
    }
  }, [messages, autoScroll, isInitialLoad, isLoading]);

  // Send message with optimistic UI
  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || !activeTopic || !user) return;

    setIsSending(true);

    // Clear input & files immediately so user can select new files
    setInput("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const tempId = `temp-${uuidv4()}`;
    const tempMessage: Message = {
      _id: tempId,
      clerkId: user.id,
      message: input,
      topic: activeTopic,
      createdAt: new Date().toISOString(),
      likes: [],
      dislikes: [],
      replies: [],
      status: "uploading",
      files: files.map((file) => ({
        _id: `temp-file-${uuidv4()}`,
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
        preview: true,
      })) as PreviewFile[],
    };

    // Optimistic UI: add temp message
    justSentIds.current.add(tempId);
    queryClient.setQueryData<Message[]>(
      ["messages", activeTopic],
      (old = []) => [...old, tempMessage]
    );

    const formData = new FormData();
    formData.append("message", input || "");
    formData.append("topic", activeTopic);
    formData.append("clerkId", user.id);
    files.forEach((file) => formData.append("files", file));

    try {
      const { data: newMessage } = await axios.post("/api/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Replace temp message with real message
      queryClient.setQueryData<Message[]>(
        ["messages", activeTopic],
        (old = []) => old.map((m) => (m._id === tempId ? newMessage : m))
      );
      justSentIds.current.add(newMessage._id);
    } catch (err) {
      console.error("❌ Failed to send message:", err);
      queryClient.setQueryData<Message[]>(
        ["messages", activeTopic],
        (old = []) =>
          old.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setIsSending(false); // input is already cleared, user can select new files now
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    setFiles((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h2>Whisper Anything About {activeTopic}</h2>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className={`${styles.messages} ${isLoading ? styles.loading : ""}`}
      >
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading whispers...</p>
          </div>
        ) : messages.length === 0 ? (
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
                {msg.files?.map((file) => {
                  if ("type" in file && "name" in file) {
                    return (
                      <div key={file._id} className={styles.previewWrapper}>
                        {file.type.startsWith("image/") && (
                          <div className={styles.previewImageWrapper}>
                            <img
                              src={file.url}
                              alt={file.name}
                              className={`${styles.previewImage} ${
                                msg.status === "uploading" ? styles.blur : ""
                              }`}
                            />
                            {msg.status === "uploading" && (
                              <div className={styles.uploadSpinner}></div>
                            )}
                          </div>
                        )}
                        {file.type.startsWith("video/") && (
                          <div className={styles.previewVideoWrapper}>
                            <video
                              src={file.url}
                              className={`${styles.previewVideo} ${
                                msg.status === "uploading" ? styles.blur : ""
                              }`}
                              controls={msg.status !== "uploading"}
                            />
                            {msg.status === "uploading" && (
                              <div className={styles.uploadSpinner}></div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}

                <WhisperActions
                  {...msg}
                  topic={msg.topic}
                  onUpdate={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["messages", activeTopic],
                    })
                  }
                  onDelete={() =>
                    queryClient.invalidateQueries({
                      queryKey: ["messages", activeTopic],
                    })
                  }
                />
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview for new files */}
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
          disabled={isSending}
        />
        <button
          type="button"
          className={styles.uploadBtn}
          onClick={handleUploadClick}
          disabled={isSending}
        >
          <Upload size={20} />
        </button>
        <input
          type="text"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isSending}
        />
        <button
          type="submit"
          className={styles.sendBtn}
          disabled={isSending || (!input.trim() && files.length === 0)}
        >
          {isSending ? (
            <div className={styles.sendSpinner}></div>
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  );
}
