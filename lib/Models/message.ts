import mongoose, { Schema, Document } from "mongoose";

export interface IFile {
  url: string;
  public_id: string;
}

export interface IReply {
  _id?: mongoose.Types.ObjectId;
  clerkId: string; // 👈 required
  message: string;
  createdAt?: Date;
  likes: string[];
  dislikes: string[];
  files?: IFile[]; // 👈 allow files in replies too
  replies?: IReply[];
}

export interface IMessage extends Document {
  message: string;
  topic: string;
  clerkId: string;
  createdAt: Date;
  likes: string[];
  dislikes: string[];
  files?: IFile[]; // 👈 allow files in main messages
  replies: IReply[];
}

// File schema
const FileSchema = new Schema<IFile>({
  url: { type: String, required: true },
  public_id: { type: String, required: true },
});

// Reply schema
const ReplySchema = new Schema<IReply>({
  _id: { type: Schema.Types.ObjectId, required: true, auto: true },
  clerkId: { type: String, required: true },
  message: { type: String, required: false, default: "" },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: String, default: [] }],
  dislikes: [{ type: String, default: [] }],
  files: { type: [FileSchema], default: [] },
  replies: { type: [], default: [] },
});

// ✅ Recursive embedding: allow infinite nesting
ReplySchema.add({ replies: [ReplySchema] });

// Message schema
const MessageSchema = new Schema<IMessage>({
  message: { type: String, required: false, default: "" },
  topic: { type: String, required: true },
  clerkId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: [{ type: String, default: [] }],
  dislikes: [{ type: String, default: [] }],
  files: { type: [FileSchema], default: [] },
  replies: [ReplySchema],
});
const MessageModel =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default MessageModel;
