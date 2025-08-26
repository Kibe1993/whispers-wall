"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import styles from "./WhisperActions.module.css";
import { WhisperProps, Reply } from "@/lib/interface/typescriptinterface";
import { formatDistanceToNow } from "date-fns";

interface WhisperActionsProps extends WhisperProps {
  rootId?: string;
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
    files = [],
    onUpdate,
    onDelete,
    rootId: rootIdFromParent,
  } = props;

  const { user } = useUser();
  const rootId = rootIdFromParent || _id;

  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(message || "");
  const [relativeTime, setRelativeTime] = useState("");

  const isAuthor = clerkId === user?.id;

  // ✅ Sync editInput with latest message
  useEffect(() => {
    setEditInput(message || "");
  }, [message]);

  // 🕒 Relative time
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
        clerkId: user.id,
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
        clerkId: user.id,
        parentId: rootId,
      });
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to dislike:", err);
    }
  };

  // 💬 Reply
  const handleReply = async () => {
    if (!user || !replyInput.trim()) return;
    try {
      const res = await axios.post(`/api/messages/${rootId}/reply`, {
        message: replyInput,
        clerkId: user.id,
        parentReplyId: _id !== rootId ? _id : null,
      });
      setReplyInput("");
      setShowReplyInput(false);
      setShowReplies(true);
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to reply:", err);
    }
  };

  // ✏️ Edit
  const handleEdit = async () => {
    if (!user || !editInput.trim()) return;
    try {
      const res = await axios.patch(`/api/messages/${_id}`, {
        message: editInput,
        files,
        parentId: rootId,
      });
      onUpdate(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("❌ Failed to edit:", err);
    }
  };

  // 🗑️ Delete
  const handleDelete = async () => {
    if (!user) return;
    const confirmDelete = confirm(
      "Are you sure you want to delete this whisper and all its replies?"
    );
    if (!confirmDelete) return;

    try {
      await axios.delete(`/api/messages/${_id}`, {
        data: { parentId: rootId },
      });
      onDelete(_id, rootId);
    } catch (err) {
      console.error("❌ Failed to delete:", err);
    }
  };

  return (
    <div className={styles.whisperContainer}>
      {/* Meta row */}
      <div className={styles.meta}>
        <span className={styles.username}>
          @{clerkId?.slice(0, 10) || "anon"}
        </span>
        <span className={styles.dot}>·</span>
        <span className={styles.timestamp}>{relativeTime}</span>
      </div>

      {/* Message or edit form */}
      {isEditing ? (
        <div className={styles.editContainer}>
          <textarea
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            className={styles.editTextarea}
            rows={3}
          />

          {/* ✅ Show media previews while editing */}
          {files && files.length > 0 && (
            <div className={styles.filePreviewContainer}>
              {files.map((file, idx) => {
                const url = file.url;
                if (url.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
                  return (
                    <img
                      key={idx}
                      src={url}
                      alt={`attachment-${idx}`}
                      className={styles.fileImage}
                    />
                  );
                }
                if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
                  return (
                    <video
                      key={idx}
                      src={url}
                      controls
                      className={styles.fileVideo}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}

          <div className={styles.editActions}>
            <button onClick={handleEdit} className={styles.saveBtn}>
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditInput(message || ""); // reset
              }}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className={styles.messageText}>{message}</p>

          {/* ✅ Normal media rendering */}
          {files && files.length > 0 && (
            <div className={styles.filePreviewContainer}>
              {files.map((file, idx) => {
                const url = file.url;

                if (url.match(/\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
                  return (
                    <img
                      key={idx}
                      src={url}
                      alt={`attachment-${idx}`}
                      className={styles.fileImage}
                    />
                  );
                }

                if (url.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
                  return (
                    <video
                      key={idx}
                      src={url}
                      controls
                      className={styles.fileVideo}
                    />
                  );
                }

                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.fileLink}
                  >
                    📎 Attachment {idx + 1}
                  </a>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button onClick={() => setShowReplies((p) => !p)}>
          💬 {replies.length}
        </button>
        <button onClick={() => setShowReplyInput((p) => !p)}>✍️ Reply</button>
        <button onClick={handleLike}>❤️ {likes.length}</button>
        <button onClick={handleDislike}>👎 {dislikes.length}</button>
        {isAuthor && !isEditing && (
          <>
            <button
              onClick={() => {
                setIsEditing(true);
                setEditInput(message || ""); // preload before editing
              }}
            >
              ✏️ Edit
            </button>
            <button onClick={handleDelete}>🗑️ Delete</button>
          </>
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

      {/* Nested replies */}
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
              files={r.files || []}
              onUpdate={onUpdate}
              onDelete={onDelete}
              rootId={rootId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
