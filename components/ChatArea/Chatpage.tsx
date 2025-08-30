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
import {
  Message,
  PreviewFile,
  FileMeta,
} from "@/lib/interface/typescriptinterface";
import {
  mergeUpdatedMessage,
  removeReplyRecursively,
} from "@/lib/utils/messageHelpers";
import { useMessages } from "@/app/hooks/useMessages";

export default function ChatPage() {
  const { activeTopic } = useTopic();
  const { user } = useUser();
  const { messages, setMessages, isLoading, justSentIds } =
    useMessages(activeTopic);

  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [autoScroll, setAutoScroll] = useState(true);

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

  // Auto-scroll effect
  useEffect(() => {
    if (!messagesEndRef.current) return;

    if (isInitialLoad && messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        setIsInitialLoad(false);
      }, 100);
      return;
    }

    if (autoScroll) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  }, [messages, autoScroll, isInitialLoad]);

  // Send message
  const handleSend = async () => {
    if ((!input.trim() && files.length === 0) || !activeTopic || !user) return;

    setIsSending(true);
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

    setMessages((prev) => [...prev, tempMessage]);
    setInput("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const formData = new FormData();
    formData.append("message", input);
    formData.append("topic", activeTopic);
    formData.append("clerkId", user.id);
    files.forEach((file) => formData.append("files", file));

    try {
      const { data: newMessage } = await axios.post("/api/messages", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // mark so the forthcoming Pusher echo is ignored
      if (justSentIds?.current) {
        justSentIds.current.add(newMessage._id);
      }

      // - remove any real copy Pusher may have already inserted
      setMessages((prev) => {
        const filtered = prev.filter(
          (m) => m._id !== tempId && m._id !== newMessage._id
        );
        return [...filtered, newMessage];
      });
    } catch (err) {
      console.error("❌ Failed to send message:", err);
      setMessages((prev) =>
        prev.map((m) => (m._id === tempId ? { ...m, status: "failed" } : m))
      );
    } finally {
      setIsSending(false);
    }
  };

  // Update / delete helpers
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
    setFiles((prev) => [...prev, ...Array.from(list)]);
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
                {/* File previews inside messages */}
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

                {/* Message content */}
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
