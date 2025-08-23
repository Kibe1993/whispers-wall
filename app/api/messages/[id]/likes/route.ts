import { connectDB } from "@/lib/DB/connectDB";
import { Reply } from "@/lib/interface/typescriptinterface";
import MessageModel from "@/lib/Models/message";
import { pusher } from "@/lib/Pusher/pusher";
import { NextRequest, NextResponse } from "next/server";

// recursive helper to find a reply by ID
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
      // 👍 Like on ROOT message
      if (message.likes.includes(clerkId)) {
        message.likes = message.likes.filter((uid: string) => uid !== clerkId);
      } else {
        message.likes.push(clerkId);
        message.dislikes = message.dislikes.filter(
          (uid: string) => uid !== clerkId
        );
      }
    } else {
      // 👍 Like on REPLY
      const reply = findReplyById(message.replies, id);
      if (!reply) {
        return NextResponse.json({ error: "Reply not found" }, { status: 404 });
      }

      if (reply.likes.includes(clerkId)) {
        reply.likes = reply.likes.filter((uid: string) => uid !== clerkId);
      } else {
        reply.likes.push(clerkId);
        reply.dislikes = reply.dislikes.filter(
          (uid: string) => uid !== clerkId
        );
      }
    }

    const savedMsg = await message.save();

    // ✅ Broadcast updated message via Pusher
    await pusher.trigger(
      `topic-${message.topic}`, // channel
      "update-message", // event
      savedMsg // payload
    );

    return NextResponse.json(savedMsg, { status: 200 });
  } catch (error) {
    console.error("❌ Error updating like:", error);
    return NextResponse.json(
      { error: "Failed to update like" },
      { status: 500 }
    );
  }
}
