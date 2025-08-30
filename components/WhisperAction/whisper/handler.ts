import axios from "axios";
import { FileMeta, Message } from "@/lib/interface/typescriptinterface";

// --- Like ---
export const handleLike = async ({
  user,
  _id,
  rootId,
  onUpdate,
}: {
  user: { id: string } | null;
  _id: string;
  rootId: string;
  onUpdate: (data: Message) => void;
}) => {
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

// --- Dislike ---
export const handleDislike = async ({
  user,
  _id,
  rootId,
  onUpdate,
}: {
  user: { id: string } | null;
  _id: string;
  rootId: string;
  onUpdate: (data: Message) => void;
}) => {
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

// --- Delete ---
export const handleDelete = async ({
  user,
  _id,
  rootId,
  onDelete,
}: {
  user: { id: string } | null;
  _id: string;
  rootId: string;
  onDelete: (_id: string, parentId?: string) => void;
}) => {
  if (!user) return;
  if (!confirm("Are you sure you want to delete this?")) return;

  try {
    await axios.delete(`/api/messages/${_id}`, {
      data: { parentId: rootId },
    });
    onDelete(_id, rootId !== _id ? rootId : undefined);
  } catch (err) {
    console.error("❌ Failed to delete:", err);
  }
};

// --- Reply ---
export const handleReply = async ({
  user,
  _id,
  rootId,
  message,
  files,
  onUpdate,
  onClear,
}: {
  user: { id: string } | null;
  _id: string;
  rootId: string;
  message: string;
  files: File[];
  onUpdate: (data: Message) => void;
  onClear: () => void;
}) => {
  if (!user) return;
  if (!message.trim() && files.length === 0) return;

  try {
    let uploadedUrls: string[] = [];

    if (files.length > 0) {
      const formData = new FormData();
      files.forEach((file) => formData.append("file", file));
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
      message,
      clerkId: user.id,
      parentReplyId: _id !== rootId ? _id : undefined,
      files: uploadedUrls.map((url) => ({ url } as FileMeta)),
    });

    onClear();
    onUpdate(res.data);
  } catch (err) {
    console.error("❌ Failed to reply:", err);
  }
};

// --- Edit ---
export const handleEdit = async ({
  _id,
  rootId,
  message,
  files,
  onUpdate,
  onClose,
}: {
  _id: string;
  rootId: string;
  message: string;
  files: FileMeta[];
  onUpdate: (data: Message) => void;
  onClose: () => void;
}) => {
  if (!message.trim()) return;

  try {
    const res = await axios.patch(`/api/messages/${_id}`, {
      message,
      files,
      parentId: rootId,
    });
    onUpdate(res.data);
    onClose();
  } catch (err) {
    console.error("❌ Failed to edit:", err);
  }
};
