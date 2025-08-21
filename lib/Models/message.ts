// models/Message.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IMessage extends Document {
  message: string;
  topic: string;
  clerkId: string; // Clerk user identifier
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  message: { type: String, required: true },
  topic: { type: String, required: true },
  clerkId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const MessageModel =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default MessageModel;
