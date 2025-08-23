"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import styles from "./WhisperActions.module.css";
import { WhisperProps, Reply } from "@/lib/interface/typescriptinterface";
import { formatDistanceToNow } from "date-fns";

interface WhisperActionsProps extends WhisperProps {
  rootId?: string; // ✅ optional, auto-resolved if missing
  onUpdate: (msg: any) => void;
}

export default function WhisperActions(props: WhisperActionsProps) {
  const {
    _id,
    message,
    clerkId,
    likes,
    dislikes,
    replies,
    createdAt,
    topic,
    onUpdate,
    rootId: rootIdFromParent,
  } = props;

  const { user } = useUser();

  // ✅ Normalize rootId: if not passed, use own _id
  const rootId = rootIdFromParent || _id;

  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(message);
  const [relativeTime, setRelativeTime] = useState("");

  const isAuthor = clerkId === user?.id;

  // 🕒 Relative time updater
  useEffect(() => {
    if (!createdAt) return;
    const updateTime = () => {
      setRelativeTime(
        formatDistanceToNow(new Date(createdAt), { addSuffix: true })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // ❤️ Like
  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axios.post(`/api/messages/${_id}/likes`, {
        clerkId: user.id, // ✅ use Clerk ID
        parentId: rootId,
      });
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to like:", err);
    }
  };

  // 👎 Dislike
  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axios.post(`/api/messages/${_id}/dislikes`, {
        clerkId: user.id, // ✅ use Clerk ID
        parentId: rootId,
      });
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to dislike:", err);
    }
  };

  const handleReply = async () => {
    if (!user || !replyInput.trim()) return;
    try {
      const res = await axios.post(`/api/messages/${rootId}/reply`, {
        message: replyInput,
        clerkId: user.id,
        parentReplyId: _id !== rootId ? _id : null, // ✅ reply to the actual parent, not always root
      });
      setReplyInput("");
      setShowReplyInput(false);
      setShowReplies(true);
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to post reply:", err);
    }
  };

  // ✏️ Edit
  const handleEdit = async () => {
    if (!user || !editInput.trim()) return;
    try {
      const res = await axios.patch(`/api/messages/${_id}`, {
        message: editInput,
        parentId: rootId,
      });
      onUpdate(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("❌ Failed to edit message:", err);
    }
  };

  return (
    <div className={styles.whisperContainer}>
      {/* Meta row */}
      <div className={styles.meta}>
        <span className={styles.username}>
          @{clerkId?.slice(0, 6) || "anon"}
        </span>
        <span className={styles.dot}>·</span>
        <span className={styles.timestamp}>{relativeTime}</span>
      </div>

      {/* Message */}
      {isEditing ? (
        <div className={styles.editContainer}>
          <textarea
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            className={styles.editTextarea}
            rows={3}
          />
          <div className={styles.editActions}>
            <button onClick={handleEdit} className={styles.saveBtn}>
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditInput(message);
              }}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={styles.messageText}>{message}</p>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <button onClick={() => setShowReplies((p) => !p)}>
          💬 {replies.length}
        </button>
        <button onClick={() => setShowReplyInput((p) => !p)}>✍️ Reply</button>
        <button onClick={handleLike}>❤️ {likes.length}</button>
        <button onClick={handleDislike}>👎 {dislikes.length}</button>
        {isAuthor && !isEditing && (
          <button onClick={() => setIsEditing(true)}>✏️ Edit</button>
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <form
          className={styles.replyInput}
          onSubmit={(e) => {
            e.preventDefault();
            handleReply();
          }}
        >
          <input
            type="text"
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            placeholder="Whisper your reply"
          />
          <button type="submit">Reply</button>
        </form>
      )}

      {/* Replies */}
      {showReplies && replies.length > 0 && (
        <div className={styles.replies}>
          {replies.map((r: Reply) => (
            <WhisperActions
              key={r._id}
              _id={r._id}
              message={r.message}
              clerkId={r.clerkId}
              likes={r.likes || []}
              dislikes={r.dislikes || []}
              replies={r.replies || []}
              createdAt={r.createdAt}
              topic={topic}
              onUpdate={onUpdate}
              rootId={rootId} // ✅ always pass down normalized rootId
            />
          ))}
        </div>
      )}
    </div>
  );
}
