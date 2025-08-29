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

export async function POST(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  await connectDB();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, parentReplyId, files } = await req.json();

    const msg = await MessageModel.findById(params.id);
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (!message?.trim() && (!files || files.length === 0)) {
      return NextResponse.json(
        { error: "Reply must have text or at least one file" },
        { status: 400 }
      );
    }

    const newReply: Reply = {
      _id: new mongoose.Types.ObjectId().toString(),
      clerkId: userId,
      message: message.trim(),
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date().toISOString(),
      files: files?.length ? files : undefined,
    };

    const insertReply = (replies: Reply[]): boolean => {
      for (const r of replies) {
        if (r._id.toString() === parentReplyId) {
          r.replies.push(newReply);
          return true;
        }
        if (r.replies && insertReply(r.replies)) return true;
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

    const savedMsg = await msg.save();
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
