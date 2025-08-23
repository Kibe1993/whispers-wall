import mongoose from "mongoose";
import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { Reply } from "@/lib/interface/typescriptinterface";
import { pusher } from "@/lib/Pusher/pusher";

export async function POST(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };

  await connectDB();

  const { userId } = await auth();

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

    const newReply: Reply = {
      _id: new mongoose.Types.ObjectId().toString(),
      clerkId: userId,
      message,
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date().toISOString(),
    };

    if (parentReplyId) {
      const insertReply = (replies: Reply[]): boolean => {
        for (const r of replies) {
          if (r._id.toString() === parentReplyId) {
            r.replies.push(newReply as Reply);
            return true;
          } else if (r.replies.length > 0) {
            if (insertReply(r.replies)) return true;
          }
        }
        return false;
      };

      const inserted = insertReply(msg.replies as Reply[]);
      if (!inserted)
        return NextResponse.json(
          { error: "Parent reply not found" },
          { status: 404 }
        );
    } else {
      msg.replies.push(newReply as Reply);
    }

    const savedMsg = await msg.save();

    // ✅ Trigger Pusher so all clients update in real time
    await pusher.trigger(
      `topic-${msg.topic}`, // channel
      "update-message", // event name
      savedMsg // full updated message
    );

    return NextResponse.json(savedMsg, { status: 200 });
  } catch (err) {
    console.error("❌ Error adding reply:", err);
    return NextResponse.json({ error: "Failed to add reply" }, { status: 500 });
  }
}
