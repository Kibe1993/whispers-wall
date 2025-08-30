"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import axios from "axios";
import styles from "./WhisperActions.module.css";
import {
  WhisperProps,
  Reply,
  FileMeta,
} from "@/lib/interface/typescriptinterface";
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
  File,
  Image,
  Video,
} from "lucide-react";

interface WhisperActionsProps extends WhisperProps {
  rootId?: string;
  isAnonymous?: boolean;
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
    isAnonymous = false,
  } = props;

  const { user, isLoaded: isUserLoaded } = useUser();
  const rootId = rootIdFromParent || _id;

  const [showReplies, setShowReplies] = useState(false);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyInput, setReplyInput] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(message || "");
  const [relativeTime, setRelativeTime] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());
  const [loadedVideos, setLoadedVideos] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if user is author only when user data is loaded
  const isAuthor = isUserLoaded && user && clerkId && clerkId === user.id;

  // State for fullscreen modal
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  /** Sync message */
  useEffect(() => {
    setEditInput(message || "");
  }, [message]);

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

  /** Auto-scroll to new messages */
  useEffect(() => {
    if (containerRef.current && !isEditing && !showReplyInput) {
      // Scroll to the bottom of the container when new content appears
      containerRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [message, files, replies, isEditing, showReplyInput]);

  /** Like */
  const handleLike = async () => {
    if (!user || isLiking) return;
    try {
      setIsLiking(true);
      const res = await axios.post(`/api/messages/${_id}/likes`, {
        clerkId: user.id,
        parentId: rootId,
      });
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to like:", err);
    } finally {
      setIsLiking(false);
    }
  };

  /** Dislike */
  const handleDislike = async () => {
    if (!user || isDisliking) return;
    try {
      setIsDisliking(true);
      const res = await axios.post(`/api/messages/${_id}/dislikes`, {
        clerkId: user.id,
        parentId: rootId,
      });
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to dislike:", err);
    } finally {
      setIsDisliking(false);
    }
  };

  /** Reply */
  const handleReply = async () => {
    if (!user || isReplying) return;
    if (!replyInput.trim() && replyFiles.length === 0) return;
    try {
      setIsReplying(true);

      // Upload files first if any
      let uploadedUrls: string[] = [];
      if (replyFiles.length > 0) {
        const formData = new FormData();
        replyFiles.forEach((file) => formData.append("file", file));
        formData.append(
          "upload_preset",
          process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string
        );

        const uploadResponse = await axios.post(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        uploadedUrls = uploadResponse.data.secure_urls || [
          uploadResponse.data.secure_url,
        ];
      }

      const res = await axios.post(`/api/messages/${rootId}/reply`, {
        message: replyInput,
        clerkId: user.id,
        parentReplyId: _id !== rootId ? _id : undefined,
        files: uploadedUrls.map((url) => ({ url })),
      });

      setReplyInput("");
      setReplyFiles([]);
      setShowReplyInput(false);
      setShowReplies(true);
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to reply:", err);
    } finally {
      setIsReplying(false);
    }
  };

  /** Edit */
  const handleEdit = async () => {
    if (!user || !editInput.trim()) return;
    try {
      const res = await axios.patch(`/api/messages/${_id}`, {
        message: editInput,
        files: files,
        parentId: rootId,
      });
      onUpdate(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("❌ Failed to edit:", err);
    }
  };

  /** Delete */
  const handleDeleteAction = async () => {
    if (!user || isDeleting) return;
    if (!confirm("Are you sure you want to delete this?")) return;

    try {
      setIsDeleting(true);
      await axios.delete(`/api/messages/${_id}`, {
        data: { parentId: rootId },
      });

      // Call onDelete with proper parameters
      onDelete(_id, rootId !== _id ? rootId : undefined);
    } catch (err) {
      console.error("❌ Failed to delete:", err);
    } finally {
      setIsDeleting(false);
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

  // Handle image load
  const handleImageLoad = (url: string) => {
    setLoadedImages((prev) => new Set(prev).add(url));
  };

  // Handle video load
  const handleVideoLoad = (url: string) => {
    setLoadedVideos((prev) => new Set(prev).add(url));
  };

  const renderFilePreview = (
    file: FileMeta & { mimeType?: string; type?: string }
  ) => {
    if (!file.url) return null;
    if (file.url.startsWith("blob:")) return null;

    const url = file.url;
    const type = file.mimeType || file.type || "";

    const isImage =
      type.startsWith("image/") || /\.(jpeg|jpg|png|gif|webp)$/i.test(url);
    const isVideo = type.startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(url);

    if (isImage) {
      const isLoaded = loadedImages.has(url);

      return (
        <div className={styles.filePreviewItem} key={file._id || url}>
          {!isLoaded && (
            <div className={styles.mediaPlaceholder}>
              <Image size={24} />
              <span>Loading image...</span>
            </div>
          )}
          <img
            src={url}
            alt="Attachment"
            className={`${styles.fileImage} ${isLoaded ? styles.loaded : ""}`}
            onClick={() => setSelectedImage(url)}
            onLoad={() => handleImageLoad(url)}
            style={{ display: isLoaded ? "block" : "none" }}
          />
        </div>
      );
    }

    if (isVideo) {
      const isLoaded = loadedVideos.has(url);

      return (
        <div className={styles.filePreviewItem} key={file._id || url}>
          {!isLoaded && (
            <div className={styles.mediaPlaceholder}>
              <Video size={24} />
              <span>Loading video...</span>
            </div>
          )}
          <video
            src={url}
            controls
            className={`${styles.fileVideo} ${isLoaded ? styles.loaded : ""}`}
            onLoadedData={() => handleVideoLoad(url)}
            style={{ display: isLoaded ? "block" : "none" }}
          />
        </div>
      );
    }

    return (
      <div className={styles.filePreviewItem} key={file._id || url}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.fileLink}
        >
          <File size={16} />
          <span>Download File</span>
        </a>
      </div>
    );
  };

  // Don't render anything if user data isn't loaded yet
  if (!isUserLoaded) {
    return <div className={styles.loading}>Loading...</div>;
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.whisperContainer} ${
        isAnonymous ? styles.anonymous : ""
      }`}
    >
      {/* Meta */}
      <div className={styles.meta}>
        <span className={styles.username}>
          {isAnonymous ? "Anonymous" : `@${clerkId?.slice(0, 10) || "unknown"}`}
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
          {/* File attachments */}
          {files && files.length > 0 && (
            <div className={styles.fileAttachments}>
              {files.map(renderFilePreview)}
            </div>
          )}

          <p className={styles.messageText}>{message}</p>
        </>
      )}

      {/* Action buttons */}
      <div className={styles.actions}>
        <button
          onClick={handleLike}
          className={styles.actionBtn}
          disabled={isLiking || isAnonymous}
        >
          <Heart
            size={16}
            fill={likes?.includes(user?.id || "") ? "currentColor" : "none"}
          />
          {likes?.length || 0}
        </button>
        <button
          onClick={handleDislike}
          className={styles.actionBtn}
          disabled={isDisliking || isAnonymous}
        >
          <ThumbsDown
            size={16}
            fill={dislikes?.includes(user?.id || "") ? "currentColor" : "none"}
          />
          {dislikes?.length || 0}
        </button>
        <button
          onClick={() => setShowReplyInput((prev) => !prev)}
          className={styles.actionBtn}
          disabled={isAnonymous}
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
        {isAuthor && !isAnonymous && (
          <>
            <button
              onClick={() => setIsEditing(true)}
              className={styles.actionBtn}
            >
              <Edit size={16} /> Edit
            </button>
            <button
              onClick={handleDeleteAction}
              className={styles.actionBtn}
              disabled={isDeleting}
            >
              <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Delete"}
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
              disabled={isReplying}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isReplying}
            >
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
            <button type="submit" disabled={isReplying}>
              {isReplying ? "Replying..." : "Reply"}
            </button>
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
              isAnonymous={!r.clerkId}
            />
          ))}
        </div>
      )}

      {/* Fullscreen image modal */}
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
