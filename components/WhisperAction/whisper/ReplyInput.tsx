import { useState, useRef } from "react";
import axios from "axios";
import styles from "../WhisperActions.module.css";
import { Upload } from "lucide-react";
import { FileMeta, Message } from "@/lib/interface/typescriptinterface"; // adjust path
import { useUser } from "@clerk/nextjs";

interface ReplyInputProps {
  rootId: string;
  _id: string;
  onUpdate: (data: Message) => void;
  onCancel: () => void;
  user: ReturnType<typeof useUser>["user"];
}

export default function ReplyInput({
  rootId,
  _id,
  onUpdate,
  onCancel,
  user,
}: ReplyInputProps) {
  const [replyInput, setReplyInput] = useState<string>("");
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [isReplying, setIsReplying] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleReplyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList) return;

    const filesArray: File[] = Array.from(filesList);
    setReplyFiles((prev) => [...prev, ...filesArray]);

    e.target.value = ""; // reset input
  };

  const removeReplyFile = (index: number) => {
    setReplyFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReply = async () => {
    if (!user || isReplying) return;
    if (!replyInput.trim() && replyFiles.length === 0) return;

    try {
      setIsReplying(true);
      let uploadedFiles: FileMeta[] = [];

      if (replyFiles.length > 0) {
        uploadedFiles = await Promise.all(
          replyFiles.map(async (file) => {
            const formData = new FormData();
            formData.append("file", file);
            formData.append(
              "upload_preset",
              process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET as string
            );

            const uploadResponse = await axios.post(
              `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
              formData,
              { headers: { "Content-Type": "multipart/form-data" } }
            );

            return {
              url: uploadResponse.data.secure_url,
              type: file.type.startsWith("image/")
                ? "image"
                : file.type.startsWith("video/")
                ? "video"
                : "raw",
              mimeType: file.type,
              name: file.name,
            } as FileMeta;
          })
        );
      }

      const res = await axios.post<Message>(`/api/messages/${rootId}/reply`, {
        message: replyInput,
        clerkId: user.id,
        parentReplyId: _id !== rootId ? _id : undefined,
        files: uploadedFiles,
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
            {file.type.startsWith("image/") ? (
              <img
                src={URL.createObjectURL(file)}
                alt={file.name || "preview"}
                className={styles.replyPreviewImage}
              />
            ) : (
              <video
                src={URL.createObjectURL(file)}
                className={styles.replyPreviewImage}
                controls
              />
            )}
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
