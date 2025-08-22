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

interface Reply {
  _id?: string;
  message: string;
  clerkId?: string;
  createdAt?: string;
  userName?: string;
}

export interface WhisperProps {
  _id?: string;
  message: string;
  clerkId?: string;
  likes: string[];
  dislikes: string[];
  replies: Reply[];
  topic?: string;
  onUpdate: (updatedMsg: Message) => void;
  isUser?: boolean;
}
