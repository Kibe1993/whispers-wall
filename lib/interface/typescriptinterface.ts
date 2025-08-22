// types/message.ts
export interface Message {
  _id?: string;
  message: string;
  topic: string;
  clerkId?: string;
  createdAt?: string;
  likes?: string[]; // or a type representing who liked
  dislikes?: string[]; // same here
  replies?: {
    _id?: string;
    message: string;
    clerkId?: string;
    createdAt?: string;
  }[];
}

export interface Reply {
  _id?: string;
  message: string;
  clerkId: string;
  createdAt: string;
}

export interface WhisperProps {
  _id?: string;
  message: string;
  clerkId?: string;
  likes: any[];
  dislikes: any[];
  replies: any[];
  topic?: string;
  onUpdate: (updatedMsg: any) => void;
  isUser?: boolean; // <-- add this
}
