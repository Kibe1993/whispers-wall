import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  await connectDB();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { message, parentReplyId } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 }
      );
    }

    const msg = await MessageModel.findById(params.id);
    if (!msg) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (parentReplyId) {
      // recursive search for the reply
      const updateReply = (replies: any[]): boolean => {
        for (const r of replies) {
          if (r._id.toString() === parentReplyId) {
            if (r.clerkId !== userId) {
              throw new Error("Not authorized to edit this reply");
            }
            r.message = message;
            return true;
          } else if (r.replies.length > 0) {
            if (updateReply(r.replies)) return true;
          }
        }
        return false;
      };

      const updated = updateReply(msg.replies);
      if (!updated) {
        return NextResponse.json({ error: "Reply not found" }, { status: 404 });
      }

      const savedMsg = await msg.save();
      return NextResponse.json(savedMsg, { status: 200 });
    } else {
      // editing the root whisper
      if (msg.clerkId !== userId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      msg.message = message;
      const savedMsg = await msg.save();
      return NextResponse.json(savedMsg, { status: 200 });
    }
  } catch (error) {
    console.error("❌ Error editing message:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to edit message",
      },
      { status: 500 }
    );
  }
}
