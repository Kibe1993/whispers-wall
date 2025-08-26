export interface FileMeta {
  _id: string;
  url: string;
  public_id?: string;
}

export interface Reply {
  _id: string;
  clerkId: string;
  message: string;
  createdAt?: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: FileMeta[]; // ✅ include files
}

export interface Message {
  _id: string;
  message: string;
  topic: string;
  clerkId: string;
  createdAt: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: FileMeta[]; // ✅ include files
}

export interface WhisperProps {
  _id: string;
  message: string;
  clerkId: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  files?: FileMeta[]; // ✅ instead of string[]
  topic?: string;
  createdAt?: string;
  rootId?: string;
  isUser?: boolean;
  onUpdate: (updatedMsg: Message) => void;
  onDelete: (id: string, parentId?: string | null) => void;
}
