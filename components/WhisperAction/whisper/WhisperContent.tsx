import { useState } from "react";
import axios from "axios";
import styles from "../WhisperActions.module.css";
import FilePreview from "./FilePreview";
import { FileMeta } from "@/lib/interface/typescriptinterface";
import { Message } from "@/lib/interface/typescriptinterface";

interface WhisperContentProps {
  message: string;
  files: FileMeta[];
  isEditing: boolean;
  editInput: string;
  setEditInput: React.Dispatch<React.SetStateAction<string>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  onUpdate?: (updatedMessage: Message) => void;
  _id: string;
  rootId: string;
  setSelectedImage: (url: string | null) => void;
  onMediaLoad?: () => void; // ✅ new scroll callback
}

export default function WhisperContent({
  message,
  files,
  isEditing,
  editInput,
  setEditInput,
  setIsEditing,
  onUpdate,
  _id,
  rootId,
  setSelectedImage,
  onMediaLoad,
}: WhisperContentProps) {
  const handleEdit = async () => {
    if (!editInput.trim()) return;
    try {
      const res = await axios.patch(`/api/messages/${_id}`, {
        message: editInput,
        files: files,
        parentId: rootId,
      });
      onUpdate?.(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("❌ Failed to edit:", err);
    }
  };

  if (isEditing) {
    return (
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
    );
  }

  return (
    <>
      {files && files.length > 0 && (
        <div className={styles.fileAttachments}>
          {files.map((file) => (
            <FilePreview
              key={file._id || file.url}
              file={file}
              onImageClick={setSelectedImage}
              onMediaLoad={onMediaLoad} // ✅ pass callback down
            />
          ))}
        </div>
      )}
      <p className={styles.messageText}>{message}</p>
    </>
  );
}
