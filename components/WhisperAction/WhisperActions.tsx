"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import styles from "./WhisperActions.module.css";
import { WhisperProps, Reply } from "@/lib/interface/typescriptinterface";
import { formatDistanceToNow } from "date-fns";
import {
  Upload,
  X,
  MessageCircle,
  Heart,
  ThumbsDown,
  Edit,
  Trash2,
  Reply as ReplyIcon,
} from "lucide-react";

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
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(message || "");
  const [relativeTime, setRelativeTime] = useState("");
  const [filesState, setFilesState] = useState(files || []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isAuthor = clerkId === user?.id;

  // ✅ NEW: state for fullscreen modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  /** Sync message */
  useEffect(() => {
    setEditInput(message || "");
  }, [message]);

  /** Sync files */
  useEffect(() => {
    setFilesState(files || []);
  }, [files]);

  /** Time updater */
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

  /** Like */
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

  /** Dislike */
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

  /** Reply */
  const handleReply = async () => {
    if (!user) return;
    if (!replyInput.trim() && replyFiles.length === 0) return;
    try {
      const formData = new FormData();
      formData.append("message", replyInput);
      formData.append("clerkId", user.id);
      if (_id !== rootId) formData.append("parentReplyId", _id);

      replyFiles.forEach((file) => formData.append("files", file));

      const res = await axios.post(`/api/messages/${rootId}/reply`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setReplyInput("");
      setReplyFiles([]);
      setShowReplyInput(false);
      setShowReplies(true);
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to reply:", err);
    }
  };

  /** Edit */
  const handleEdit = async () => {
    if (!user || !editInput.trim()) return;
    try {
      const res = await axios.patch(`/api/messages/${_id}`, {
        message: editInput,
        files: filesState,
        parentId: rootId,
      });
      onUpdate(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("❌ Failed to edit:", err);
    }
  };

  /** Delete */
  const handleDelete = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this?")) return;

    try {
      await axios.delete(`/api/messages/${_id}`, {
        data: { parentId: rootId },
      });

      const res = await axios.get(`/api/messages?topic=${topic}`);
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to delete:", err);
    }
  };

  /** File input */
  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setReplyFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  /** Remove file */
  const removeReplyFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={styles.whisperContainer}>
      {/* Meta */}
      <div className={styles.meta}>
        <span className={styles.username}>
          @{clerkId?.slice(0, 10) || "anon"}
        </span>
        <span className={styles.dot}>·</span>
        <span className={styles.timestamp}>{relativeTime}</span>
      </div>

      {/* Message or edit */}
      {isEditing ? (
        <div className={styles.editContainer}>
          <textarea
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            className={styles.editTextarea}
            rows={3}
          />

          {filesState?.length > 0 && (
            <div className={styles.filePreviewContainer}>
              {filesState.map((file, idx) => (
                <div key={idx}>
                  {file.url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                    <img
                      src={file.url}
                      className={styles.fileImage}
                      onClick={() => setSelectedImage(file.url)} // ✅ NEW
                    />
                  ) : file.url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                      src={file.url}
                      controls
                      className={styles.fileVideo}
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}

          <div className={styles.editActions}>
            <button onClick={handleEdit} className={styles.saveBtn}>
              Save
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditInput(message || "");
              }}
              className={styles.cancelBtn}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {filesState?.length > 0 && (
            <div className={styles.filePreviewContainer}>
              {filesState.map((file, idx) => (
                <div key={idx}>
                  {file.url.match(/\.(jpeg|jpg|png|gif|webp)$/i) ? (
                    <img
                      src={file.url}
                      className={styles.fileImage}
                      onClick={() => setSelectedImage(file.url)} // ✅ NEW
                    />
                  ) : file.url.match(/\.(mp4|webm|ogg)$/i) ? (
                    <video
                      src={file.url}
                      controls
                      className={styles.fileVideo}
                    />
                  ) : (
                    <a href={file.url} target="_blank" rel="noreferrer">
                      📎 Attachment {idx + 1}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className={styles.messageText}>{message}</p>
        </>
      )}

      {/* ✅ Action buttons restored */}
      <div className={`${styles.actions} flex flex-wrap gap-2`}>
        <button onClick={handleLike} className={styles.actionBtn}>
          <Heart size={16} /> {likes?.length || 0}
        </button>
        <button onClick={handleDislike} className={styles.actionBtn}>
          <ThumbsDown size={16} /> {dislikes?.length || 0}
        </button>
        <button
          onClick={() => setShowReplyInput((prev) => !prev)}
          className={styles.actionBtn}
        >
          <ReplyIcon size={16} /> Reply
        </button>
        {replies.length > 0 && (
          <button
            onClick={() => setShowReplies((prev) => !prev)}
            className={styles.actionBtn}
          >
            <MessageCircle size={16} /> Replies ({replies.length})
          </button>
        )}
        {isAuthor && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className={styles.actionBtn}
            >
              <Edit size={16} /> Edit
            </button>
            <button onClick={handleDelete} className={styles.actionBtn}>
              <Trash2 size={16} /> Delete
            </button>
          </>
        )}
      </div>

      {/* Reply input */}
      {showReplyInput && (
        <form
          className={styles.replyInputWrapper}
          onSubmit={(e) => {
            e.preventDefault();
            handleReply();
          }}
        >
          <div className={styles.replyPreviewContainer}>
            {replyFiles.map((file, idx) => (
              <div key={idx} className={styles.replyPreviewItem}>
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className={styles.replyPreviewImage}
                />
                <button
                  type="button"
                  onClick={() => removeReplyFile(idx)}
                  className={styles.replyPreviewRemove}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className={styles.replyInput}>
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Write a reply..."
            />
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              <Upload size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleReplyFileChange}
              className="hidden"
            />
            <button type="submit">Reply</button>
          </div>
        </form>
      )}

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

      {/* ✅ Fullscreen image modal */}
      {selectedImage && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedImage(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Preview"
              className={styles.modalImage}
            />
            <button
              className={styles.closeBtn}
              onClick={() => setSelectedImage(null)}
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
