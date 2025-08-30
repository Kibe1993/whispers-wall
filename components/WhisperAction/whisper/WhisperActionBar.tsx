import { useState } from "react";
import styles from "../WhisperActions.module.css";
import {
  MessageCircle,
  Heart,
  ThumbsDown,
  Edit,
  Trash2,
  Reply as ReplyIcon,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { Reply, WhisperProps } from "@/lib/interface/typescriptinterface";

interface WhisperActionsBarProps {
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  isAuthor: boolean;
  isAnonymous: boolean;
  onLike: () => void;
  onDislike: () => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleReplies: () => void;
  repliesVisible: boolean;
  user: { id: string } | null;
}

export default function WhisperActionsBar({
  likes,
  dislikes,
  replies,
  isAuthor,
  isAnonymous,
  onLike,
  onDislike,
  onReply,
  onEdit,
  onDelete,
  onToggleReplies,
  repliesVisible,
  user,
}: WhisperActionsBarProps) {
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    try {
      setIsLiking(true);
      onLike();
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    if (isDisliking) return;
    try {
      setIsDisliking(true);
      onDislike();
    } finally {
      setIsDisliking(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
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
        onClick={onReply}
        className={styles.actionBtn}
        disabled={isAnonymous}
      >
        <ReplyIcon size={16} /> Reply
      </button>

      {replies.length > 0 && (
        <button onClick={onToggleReplies} className={styles.actionBtn}>
          <MessageCircle size={16} /> Replies ({replies.length}){" "}
          {repliesVisible ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      )}

      {isAuthor && !isAnonymous && (
        <>
          <button onClick={onEdit} className={styles.actionBtn}>
            <Edit size={16} /> Edit
          </button>
          <button
            onClick={handleDelete}
            className={styles.actionBtn}
            disabled={isDeleting}
          >
            <Trash2 size={16} /> {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </>
      )}
    </div>
  );
}
