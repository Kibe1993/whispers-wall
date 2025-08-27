export interface FileMeta {
  _id?: string; // ✅ optional because Mongo adds it automatically
  url: string;
  public_id?: string; // ✅ optional to support non-Cloudinary files
}

export interface Reply {
  _id: string;
  clerkId: string;
  message?: string; // ✅ optional, matches schema (files-only replies allowed)
  createdAt: string; // ✅ always present from Mongo
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: FileMeta[];
}

export interface Message {
  _id: string;
  message?: string; // ✅ optional
  topic: string;
  clerkId: string;
  createdAt: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: FileMeta[];
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
