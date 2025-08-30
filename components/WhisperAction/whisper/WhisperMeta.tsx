import styles from "../WhisperActions.module.css";

interface WhisperMetaProps {
  clerkId?: string;
  isAnonymous: boolean;
  relativeTime: string;
}

export default function WhisperMeta({
  clerkId,
  isAnonymous,
  relativeTime,
}: WhisperMetaProps) {
  return (
    <div className={styles.meta}>
      <span className={styles.username}>
        {isAnonymous ? "Anonymous" : `@${clerkId?.slice(0, 10) || "unknown"}`}
      </span>
      <span className={styles.dot}>·</span>
      <span className={styles.timestamp}>{relativeTime}</span>
    </div>
  );
}
