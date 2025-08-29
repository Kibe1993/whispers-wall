import mongoose from "mongoose";
import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { FileMeta, Reply } from "@/lib/interface/typescriptinterface";
import { pusher } from "@/lib/Pusher/pusher";
import { uploadFileToSupabase } from "@/lib/supabase/supabase";
import { v4 as uuidv4 } from "uuid";
import { uploadMediaToCloudinary } from "@/lib/cloudinary/uploadImage";

interface Context {
  params: { id: string };
}

export async function POST(req: NextRequest, context: Context) {
  await connectDB();

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { params } = context;
    const formData = await req.formData();

    const message = (formData.get("message") as string) || "";
    const parentReplyId = (formData.get("parentReplyId") as string) || null;
    const files = formData.getAll("files") as File[];

    // 🔎 Ensure parent message exists
    const msg = await MessageModel.findById(params.id);
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // 📂 Handle file uploads
    const uploadedFiles: FileMeta[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = file.name || uuidv4();

      let uploaded;
      if (file.type.startsWith("image/")) {
        uploaded = await uploadMediaToCloudinary(
          buffer,
          filename,
          `replies/${params.id}`,
          "image"
        );
      } else if (file.type.startsWith("video/")) {
        uploaded = await uploadMediaToCloudinary(
          buffer,
          filename,
          `replies/${params.id}`,
          "video"
        );
      } else {
        uploaded = await uploadFileToSupabase(
          buffer,
          filename,
          `replies/${params.id}`
        );
      }

      uploadedFiles.push({
        _id: new mongoose.Types.ObjectId().toString(),
        url: uploaded.url,
        public_id: uploaded.public_id,
      });
    }

    // 🚨 Validate reply content
    if (!message.trim() && uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "Reply must have text or at least one file" },
        { status: 400 }
      );
    }

    // 📝 Construct reply
    const newReply: Reply = {
      _id: new mongoose.Types.ObjectId().toString(),
      clerkId: userId,
      message: message.trim(),
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date().toISOString(),
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    // 📌 Insert reply (nested or root-level)
    const insertReply = (replies: Reply[]): boolean => {
      for (const r of replies) {
        if (r._id.toString() === parentReplyId) {
          r.replies.push(newReply);
          return true;
        }
        if (r.replies && insertReply(r.replies)) {
          return true;
        }
      }
      return false;
    };

    if (parentReplyId) {
      const inserted = insertReply(msg.replies as Reply[]);
      if (!inserted) {
        return NextResponse.json(
          { error: "Parent reply not found" },
          { status: 404 }
        );
      }
    } else {
      msg.replies.push(newReply);
    }

    // 💾 Save changes
    const savedMsg = await msg.save();

    // 📡 Real-time push

    await pusher.trigger(`topic-${msg.topic}`, "update-message", savedMsg);

    return NextResponse.json(savedMsg, { status: 200 });
  } catch (err: unknown) {
    console.error("❌ Reply API Error:", err);
    return NextResponse.json(
      { error: "Failed to add reply", details: (err as Error).message },
      { status: 500 }
    );
  }
}
