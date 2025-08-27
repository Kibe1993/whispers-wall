import mongoose, { Schema, Document } from "mongoose";

export interface IFile {
  url: string;
  public_id?: string; // ✅ make optional to match frontend
}

export interface IReply {
  _id?: mongoose.Types.ObjectId;
  clerkId: string;
  message?: string; // ✅ optional, since files-only replies are allowed
  createdAt?: Date;
  likes: string[];
  dislikes: string[];
  files?: IFile[];
  replies?: IReply[];
}

export interface IMessage extends Document {
  message?: string; // ✅ optional
  topic: string;
  clerkId: string;
  createdAt: Date;
  likes: string[];
  dislikes: string[];
  files?: IFile[];
  replies: IReply[];
}

// File schema
const FileSchema = new Schema<IFile>({
  url: { type: String, required: true },
  public_id: { type: String, required: false }, // ✅ not required
});

// Reply schema
const ReplySchema = new Schema<IReply>({
  clerkId: { type: String, required: true },
  message: { type: String, required: false, default: "" },
  createdAt: { type: Date, default: Date.now },
  likes: { type: [String], default: [] },
  dislikes: { type: [String], default: [] },
  files: { type: [FileSchema], default: [] },
});

// ✅ Recursive embedding for infinite nesting
ReplySchema.add({ replies: [ReplySchema] });

// Message schema
const MessageSchema = new Schema<IMessage>({
  message: { type: String, required: false, default: "" }, // ✅ optional now
  topic: { type: String, required: true },
  clerkId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: { type: [String], default: [] },
  dislikes: { type: [String], default: [] },
  files: { type: [FileSchema], default: [] },
  replies: { type: [ReplySchema], default: [] },
});

const MessageModel =
  mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

export default MessageModel;
