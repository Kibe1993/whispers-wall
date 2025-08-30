import styles from "../WhisperActions.module.css";
import { X } from "lucide-react";

interface ImageModalProps {
  selectedImage: string | null;
  onClose: () => void;
}

export default function ImageModal({
  selectedImage,
  onClose,
}: ImageModalProps) {
  if (!selectedImage) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <img src={selectedImage} alt="Preview" className={styles.modalImage} />
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>
      </div>
    </div>
  );
}
