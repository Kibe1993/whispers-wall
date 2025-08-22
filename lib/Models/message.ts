import mongoose, { Schema, Document } from "mongoose";

export interface IReply {
  message: string;
  clerkId: string;
  createdAt?: Date;
}

export interface IMessage extends Document {
  message: string;
  topic: string;
  clerkId: string;
  createdAt: Date;
  likes: string[];
  dislikes: string[];
  replies: IReply[];
}

const ReplySchema = new Schema<IReply>({
  message: { type: String, required: true },
  clerkId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const MessageSchema = new Schema<IMessage>({
  message: { type: String, required: true },
  topic: { type: String, required: true },
  clerkId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: String }],
  dislikes: [{ type: String }],
  replies: [ReplySchema], // 👈 embeds replies directly
});

const MessageModel =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default MessageModel;
