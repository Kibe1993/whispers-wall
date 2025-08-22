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

  const [showReplies, setShowReplies] = useState(false);
  const [replyInput, setReplyInput] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(message);

  const isAuthor = clerkId === user?.id;

  const handleLike = async () => {
    if (!user) return;
    const res = await axios.post(`/api/messages/${_id}/likes`, {
      userId: user.id,
    });
    onUpdate(res.data);
  };

  const handleDislike = async () => {
    if (!user) return;
    const res = await axios.post(`/api/messages/${_id}/dislikes`, {
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
    onUpdate(res.data);
  };

  const handleEdit = async () => {
    if (!user || !editInput.trim()) return;
    try {
      const res = await axios.patch(`/api/messages/${_id}`, {
        message: editInput,
      });
      onUpdate(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("❌ Failed to edit message:", err);
    }
  };

  return (
    <div className={styles.whisperContainer}>
      <div className={styles.messageWrapper}>
        {isEditing ? (
          <div className={styles.editContainer}>
            <textarea
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              className={styles.editTextarea}
              rows={4}
            />
            <div className={styles.editActions}>
              <button onClick={handleEdit} className={styles.saveBtn}>
                💾 Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditInput(message);
                }}
                className={styles.cancelBtn}
              >
                ❌ Cancel
              </button>
            </div>
          </div>
        ) : (
          <p>{message}</p>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button onClick={handleLike}>❤️ {likes.length}</button>
        <button onClick={handleDislike}>👎 {dislikes.length}</button>
        {isAuthor && !isEditing && (
          <button onClick={() => setIsEditing(true)}>✏️ Edit</button>
        )}
        <button onClick={() => setShowReplies((prev) => !prev)}>
          💬 {showReplies ? "Hide Replies" : `Replies (${replies.length})`}
        </button>
      </div>

      {/* Replies + reply input */}
      {showReplies && (
        <div className={styles.replies}>
          {replies.length > 0 &&
            replies.map((r) => (
              <p key={r._id}>
                <strong>Anonymous:</strong> {r.message}
              </p>
            ))}

          <div className={styles.replyInput}>
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Write a reply..."
            />
            <button onClick={handleReply}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
