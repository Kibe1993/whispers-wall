import { useState } from "react";
import styles from "../WhisperActions.module.css";
import { File, Image, Video } from "lucide-react";

interface FilePreviewProps {
  file: any;
  onImageClick: (url: string) => void;
}

export default function FilePreview({ file, onImageClick }: FilePreviewProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  if (!file.url || file.url.startsWith("blob:")) return null;

  const url = file.url;
  const type = file.mimeType || file.type || "";
  const isImage =
    type.startsWith("image/") || /\.(jpeg|jpg|png|gif|webp)$/i.test(url);
  const isVideo = type.startsWith("video/") || /\.(mp4|webm|ogg)$/i.test(url);

  if (isImage) {
    return (
      <div className={styles.filePreviewItem}>
        {!isImageLoaded && (
          <div className={styles.mediaPlaceholder}>
            <Image size={24} />
            <span>Loading image...</span>
          </div>
        )}
        <img
          src={url}
          alt="Attachment"
          className={`${styles.fileImage} ${
            isImageLoaded ? styles.loaded : ""
          }`}
          onClick={() => onImageClick(url)}
          onLoad={() => setIsImageLoaded(true)}
          style={{ display: isImageLoaded ? "block" : "none" }}
        />
      </div>
    );
  }

  if (isVideo) {
    return (
      <div className={styles.filePreviewItem}>
        {!isVideoLoaded && (
          <div className={styles.mediaPlaceholder}>
            <Video size={24} />
            <span>Loading video...</span>
          </div>
        )}
        <video
          src={url}
          controls
          className={`${styles.fileVideo} ${
            isVideoLoaded ? styles.loaded : ""
          }`}
          onLoadedData={() => setIsVideoLoaded(true)}
          style={{ display: isVideoLoaded ? "block" : "none" }}
        />
      </div>
    );
  }

  return (
    <div className={styles.filePreviewItem}>
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
}
