export interface FileMeta {
  _id?: string; // ✅ optional because Mongo adds it automatically
  url: string;
  public_id?: string; // ✅ optional to support non-Cloudinary files
  type: "image" | "video" | "raw";
  format?: string;
}

export interface PreviewFile extends FileMeta {
  name?: string;
  preview?: boolean;
}

export interface Reply {
  _id: string;
  clerkId: string;
  message?: string;
  createdAt: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: (FileMeta | PreviewFile)[];
}

export interface Message {
  _id: string;
  message?: string;
  topic: string;
  clerkId: string;
  createdAt: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: (FileMeta | PreviewFile)[]; // <-- union type
  status?: "uploading" | "uploaded" | "failed";
}

export interface WhisperProps {
  _id: string;
  message?: string; // ✅ optional
  clerkId: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: FileMeta[];
  topic?: string;
  createdAt?: string;
  rootId?: string;
  isUser?: boolean;
  onUpdate: (updatedMsg: Message) => void;
  onDelete: (id: string, parentId?: string | null) => void;
}
