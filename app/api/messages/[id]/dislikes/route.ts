import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { NextRequest, NextResponse } from "next/server";
import { Reply } from "@/lib/interface/typescriptinterface";
import { pusher } from "@/lib/Pusher/pusher";

// recursive helper
function findReplyById(replies: Reply[], id: string): Reply | null {
  for (const reply of replies) {
    if (reply._id.toString() === id) {
      return reply;
    }
    const found = findReplyById(reply.replies || [], id);
    if (found) return found;
  }
  return null;
}

export async function POST(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const { id } = params;
  await connectDB();

  try {
    const { parentId, clerkId } = await req.json();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const message = await MessageModel.findById(parentId || id);
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (!parentId || id === parentId) {
      // 👎 Dislike on ROOT message
      if (message.dislikes.includes(clerkId)) {
        message.dislikes = message.dislikes.filter(
          (uid: string) => uid !== clerkId
        );
      } else {
        message.dislikes.push(clerkId);
        message.likes = message.likes.filter((uid: string) => uid !== clerkId);
      }
    } else {
      // 👎 Dislike on REPLY
      const reply = findReplyById(message.replies, id);
      if (!reply) {
        return NextResponse.json({ error: "Reply not found" }, { status: 404 });
      }

      if (reply.dislikes.includes(clerkId)) {
        reply.dislikes = reply.dislikes.filter(
          (uid: string) => uid !== clerkId
        );
      } else {
        reply.dislikes.push(clerkId);
        reply.likes = reply.likes.filter((uid: string) => uid !== clerkId);
      }
    }

    const savedMsg = await message.save();

    // ✅ Broadcast update via Pusher
    await pusher.trigger(
      `topic-${message.topic}`, // channel
      "update-message", // event
      savedMsg // payload
    );

    return NextResponse.json(savedMsg, { status: 200 });
  } catch (error) {
    console.error("❌ Error updating dislike:", error);
    return NextResponse.json(
      { error: "Failed to update dislike" },
      { status: 500 }
    );
  }
}
