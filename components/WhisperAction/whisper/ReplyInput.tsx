import { useState, useRef } from "react";
import axios from "axios";
import styles from "../WhisperActions.module.css";
import { Upload } from "lucide-react";

interface ReplyInputProps {
  rootId: string;
  _id: string;
  onUpdate: (data: any) => void;
  onCancel: () => void;
  user: any;
}

export default function ReplyInput({
  rootId,
  _id,
  onUpdate,
  onCancel,
  user,
}: ReplyInputProps) {
  const [replyInput, setReplyInput] = useState("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [isReplying, setIsReplying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setReplyFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const removeReplyFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReply = async () => {
    if (!user || isReplying) return;
    if (!replyInput.trim() && replyFiles.length === 0) return;

    try {
      setIsReplying(true);
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
      onCancel();
      onUpdate(res.data);
    } catch (err) {
      console.error("❌ Failed to reply:", err);
    } finally {
      setIsReplying(false);
    }
  };

  return (
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
        <button type="button" onClick={onCancel} disabled={isReplying}>
          Cancel
        </button>
      </div>
    </form>
  );
}
