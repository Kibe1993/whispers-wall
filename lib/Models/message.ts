import mongoose, { Schema, Document } from "mongoose";

export interface IReply {
  _id?: mongoose.Types.ObjectId;
  clerkId: string; // 👈 required
  message: string;
  createdAt?: Date;
  likes: string[];
  dislikes: string[];
  replies?: IReply[];
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

// Reply schema
const ReplySchema = new Schema<IReply>({
  _id: { type: Schema.Types.ObjectId, required: true, auto: true },
  clerkId: { type: String, required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: String, default: [] }],
  dislikes: [{ type: String, default: [] }],
  replies: { type: [], default: [] }, // placeholder
});

// ✅ Recursive embedding: allow infinite nesting
ReplySchema.add({ replies: [ReplySchema] });

// Message schema
const MessageSchema = new Schema<IMessage>({
  message: { type: String, required: true },
  topic: { type: String, required: true },
  clerkId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: String, default: [] }],
  dislikes: [{ type: String, default: [] }],
  replies: [ReplySchema], // full recursive replies
});

const MessageModel =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default MessageModel;
