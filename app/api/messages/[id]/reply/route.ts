import mongoose from "mongoose";
import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  console.log("📌 API called for message ID:", params.id);

  await connectDB();
  console.log("✅ Connected to DB");

  const { userId } = await auth();
  console.log("👤 Authenticated user:", userId);

  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { message, parentReplyId } = await req.json();
    console.log(
      "💬 Incoming message:",
      message,
      "parentReplyId:",
      parentReplyId
    );

    const msg = await MessageModel.findById(params.id);
    if (!msg)
      return NextResponse.json({ error: "Message not found" }, { status: 404 });

    const newReply = {
      _id: new mongoose.Types.ObjectId(), // unique ID for replies
      clerkId: userId,
      message,
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date(),
    };

    if (parentReplyId) {
      const insertReply = (replies: any[]): boolean => {
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
      const inserted = insertReply(msg.replies);
      if (!inserted)
        return NextResponse.json(
          { error: "Parent reply not found" },
          { status: 404 }
        );
    } else {
      msg.replies.push(newReply);
    }

    const savedMsg = await msg.save();
    return NextResponse.json(savedMsg, { status: 200 });
  } catch (err) {
    console.error("❌ Error adding reply:", err);
    return NextResponse.json({ error: "Failed to add reply" }, { status: 500 });
  }
}
