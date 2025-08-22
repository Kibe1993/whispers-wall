"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import styles from "./WhisperActions.module.css";
import { WhisperProps } from "@/lib/interface/typescriptinterface";

export default function WhisperActions({
  _id,
  message,
  clerkId,
  likes,
  dislikes,
  replies,
  topic,
  onUpdate,
}: WhisperProps) {
  const { user } = useUser();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyInput, setReplyInput] = useState("");

  const isAuthor = clerkId === user?.id;

  const handleLike = async () => {
    if (!user) return;
    const res = await axios.post(`/api/messages/${_id}/like`, {
      userId: user.id,
    });
    onUpdate(res.data);
  };

  const handleDislike = async () => {
    if (!user) return;
    const res = await axios.post(`/api/messages/${_id}/dislike`, {
      userId: user.id,
    });
    onUpdate(res.data);
  };

  const handleReply = async () => {
    if (!user || !replyInput.trim()) return;
    const res = await axios.post(`/api/messages/${_id}/reply`, {
      message: replyInput,
      clerkId: user.id,
    });
    setReplyInput("");
    setShowReplyInput(false);
    onUpdate(res.data);
  };

  return (
    <div className={styles.whisperContainer}>
      {/* Message text */}
      <p>{message}</p>

      {/* Actions below the message */}
      <div className={styles.actions}>
        <button onClick={handleLike}>❤️ {likes.length}</button>
        <button onClick={handleDislike}>👎 {dislikes.length}</button>
        {isAuthor && <button onClick={() => alert("Edit")}>✏️ Edit</button>}
        <button onClick={() => setShowReplyInput((prev) => !prev)}>
          💬 Reply
        </button>
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <div className={styles.replyInput}>
          <input
            type="text"
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            placeholder="Write a reply..."
          />
          <button onClick={handleReply}>Send</button>
        </div>
      )}

      {/* Replies */}
      {replies.length > 0 && (
        <div className={styles.replies}>
          {replies.map((r) => (
            <p key={r._id}>
              <strong>{r.userName || "Anonymous"}:</strong> {r.message}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
