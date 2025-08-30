"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import styles from "./WhisperActions.module.css";
import { WhisperProps, Reply } from "@/lib/interface/typescriptinterface";
import { formatDistanceToNow } from "date-fns";
import WhisperMeta from "./whisper/WhisperMeta";
import WhisperContent from "./whisper/WhisperContent";
import WhisperActionsBar from "./whisper/WhisperActionBar";
import ReplyInput from "./whisper/ReplyInput";
import ImageModal from "./whisper/ImageModal";
import { FileMeta } from "@/lib/interface/typescriptinterface";

import * as handlers from "../WhisperAction/whisper/handler";

interface WhisperActionsProps extends WhisperProps {
  rootId?: string;
  isAnonymous?: boolean;
  showReplies?: boolean;
}

export default function WhisperActions({
  showReplies: showRepliesFromParent = false,
  ...props
}: WhisperActionsProps) {
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

  const [showReplies, setShowReplies] = useState(showRepliesFromParent);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState(message || "");
  const [relativeTime, setRelativeTime] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const isAuthor = Boolean(
    isUserLoaded && user && clerkId && clerkId === user.id
  );

  // Update edit input when message changes
  useEffect(() => setEditInput(message || ""), [message]);

  // Update relative time
  useEffect(() => {
    if (!createdAt) return;
    const updateTime = () =>
      setRelativeTime(
        formatDistanceToNow(new Date(createdAt), { addSuffix: true })
      );
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  // Scroll to this message container
  const scrollToBottom = () => {
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  // Scroll after text or replies update, but not during editing or reply input
  useEffect(() => {
    if (!isEditing && !showReplyInput) {
      scrollToBottom();
    }
  }, [message, replies, isEditing, showReplyInput]);

  if (!isUserLoaded) return <div className={styles.loading}>Loading...</div>;

  return (
    <div
      ref={containerRef}
      className={`${styles.whisperContainer} ${
        isAnonymous ? styles.anonymous : ""
      }`}
    >
      <WhisperMeta
        clerkId={clerkId}
        isAnonymous={isAnonymous}
        relativeTime={relativeTime}
      />

      <WhisperContent
        message={message ?? ""}
        files={files}
        isEditing={isEditing}
        editInput={editInput}
        setEditInput={setEditInput}
        setIsEditing={setIsEditing}
        onUpdate={onUpdate}
        _id={_id}
        rootId={rootId}
        setSelectedImage={setSelectedImage}
        // Pass scroll callback for media
        onMediaLoad={scrollToBottom}
      />

      <WhisperActionsBar
        likes={likes}
        dislikes={dislikes}
        replies={replies}
        isAuthor={isAuthor}
        isAnonymous={isAnonymous}
        onLike={() =>
          handlers.handleLike({ user, _id, rootId, onUpdate: onUpdate! })
        }
        onDislike={() =>
          handlers.handleDislike({ user, _id, rootId, onUpdate: onUpdate! })
        }
        onReply={() => setShowReplyInput((prev) => !prev)}
        onEdit={() => setIsEditing(true)}
        onDelete={() =>
          handlers.handleDelete({
            user,
            _id,
            rootId,
            onDelete: onDelete!,
          })
        }
        onToggleReplies={() => setShowReplies((prev) => !prev)}
        repliesVisible={showReplies}
        user={user}
      />

      {showReplyInput && user && (
        <ReplyInput
          rootId={rootId}
          _id={_id}
          onUpdate={onUpdate}
          onCancel={() => setShowReplyInput(false)}
          user={user}
        />
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
              showReplies={false}
            />
          ))}
        </div>
      )}

      <ImageModal
        selectedImage={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
}
