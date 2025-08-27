import mongoose from "mongoose";
import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { FileMeta, Reply } from "@/lib/interface/typescriptinterface";
import { pusher } from "@/lib/Pusher/pusher";
import { uploadFileToSupabase } from "@/lib/supabase/supabase";
import { uploadImageToCloudinary } from "@/lib/cloudinary/uploadImage";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };

  await connectDB();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const message = formData.get("message") as string;
    const parentReplyId = formData.get("parentReplyId") as string | null;
    const files = formData.getAll("files") as File[];

    // Find parent message
    const msg = await MessageModel.findById(params.id);
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // 📂 Upload any attached files (Cloudinary for media, Supabase for others)
    const uploadedFiles: FileMeta[] = [];
    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = file.name || uuidv4();

      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const uploaded = await uploadImageToCloudinary(
          buffer,
          filename,
          `replies/${params.id}`
        );
        uploadedFiles.push({
          _id: new mongoose.Types.ObjectId().toString(),
          url: uploaded.url,
          public_id: uploaded.public_id,
        });
      } else {
        const { url, public_id } = await uploadFileToSupabase(
          buffer,
          filename,
          `replies/${params.id}`
        );
        uploadedFiles.push({
          _id: new mongoose.Types.ObjectId().toString(),
          url,
          public_id,
        });
      }
    }

    // 🚨 Safeguard: must contain message text OR at least one file
    if (!message && uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "Reply must have text or at least one file" },
        { status: 400 }
      );
    }

    // 📝 Build new reply object
    const newReply: Reply = {
      _id: new mongoose.Types.ObjectId().toString(),
      clerkId: userId,
      message,
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date().toISOString(),
      files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    // 📌 Insert reply into message (nested if replying to another reply)
    if (parentReplyId) {
      const insertReply = (replies: Reply[]): boolean => {
        for (const r of replies) {
          if (r._id.toString() === parentReplyId) {
            r.replies.push(newReply);
            return true;
          } else if (r.replies.length > 0) {
            if (insertReply(r.replies)) return true;
          }
        }
        return false;
      };

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

    // 💾 Save updated message
    const savedMsg = await msg.save();

    // 📡 Trigger real-time update via Pusher
    await pusher.trigger(`topic-${msg.topic}`, "update-message", savedMsg);

    return NextResponse.json(savedMsg, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to add reply" }, { status: 500 });
  }
}
