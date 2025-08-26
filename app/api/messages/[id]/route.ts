import { connectDB } from "@/lib/DB/connectDB";
import { Reply } from "@/lib/interface/typescriptinterface";
import MessageModel from "@/lib/Models/message";
import { pusher } from "@/lib/Pusher/pusher";
import { deleteFileFromSupabase } from "@/lib/supabase/supabase";
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
      const updateReply = (replies: Reply[]): boolean => {
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

      await pusher.trigger(`topic-${msg.topic}`, "update-message", savedMsg);

      return NextResponse.json(savedMsg, { status: 200 });
    } else {
      // editing the root whisper
      if (msg.clerkId !== userId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      msg.message = message;
      const savedMsg = await msg.save();

      await pusher.trigger(`topic-${msg.topic}`, "update-message", savedMsg);

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

// 🔍 Find a reply by its ID in a nested thread
// 🔍 Find a reply by its ID in a nested thread

// Utility: find reply recursively
function findReplyRecursive(replies: Reply[], id: string): Reply | null {
  for (const reply of replies) {
    if (reply._id.toString() === id) return reply;
    if (reply.replies?.length) {
      const found = findReplyRecursive(reply.replies as Reply[], id);
      if (found) return found;
    }
  }
  return null;
}

// Utility: remove reply recursively
function removeReplyRecursive(
  replies: Reply[],
  id: string,
  userId: string
): boolean {
  const index = replies.findIndex(
    (r) => r._id.toString() === id && r.clerkId === userId
  );
  if (index !== -1) {
    replies.splice(index, 1);
    return true;
  }
  for (const reply of replies) {
    if (reply.replies?.length) {
      const removed = removeReplyRecursive(
        reply.replies as Reply[],
        id,
        userId
      );
      if (removed) return true;
    }
  }
  return false;
}

export async function DELETE(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  const { id } = params;

  await connectDB();
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { parentId } = await req.json();

    // 🟢 Case 1: root message
    if (!parentId || parentId === id) {
      const msg = await MessageModel.findById(id);
      if (!msg) {
        return NextResponse.json(
          { error: "Message not found" },
          { status: 404 }
        );
      }

      if (msg.clerkId !== userId) {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 });
      }

      // Delete the file from Supabase if it exists
      if (msg.filePath) {
        try {
          await deleteFileFromSupabase(msg.filePath);
        } catch (err) {
          console.error("❌ Supabase delete failed:", err);
        }
      }

      // Delete the record
      await msg.deleteOne();

      await pusher.trigger(`topic-${msg.topic}`, "delete-message", {
        id,
        parentId: null,
      });

      return NextResponse.json({ success: true });
    }

    // 🟢 Case 2: nested reply

    const parent = await MessageModel.findById(parentId);
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    // Find the reply in the tree
    const targetReply = findReplyRecursive(parent.replies as Reply[], id);

    if (!targetReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (targetReply.clerkId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // ✅ Replies don’t have `filePath` or `publicId`, so nothing to delete from Supabase/Cloudinary

    // Remove reply recursively from parent
    const deleted = removeReplyRecursive(parent.replies as Reply[], id, userId);

    if (!deleted) {
      return NextResponse.json(
        { error: "Reply not found or unauthorized" },
        { status: 404 }
      );
    }

    const savedParent = await parent.save();

    await pusher.trigger(
      `topic-${parent.topic}`,
      "update-message",
      savedParent
    );

    return NextResponse.json(savedParent, { status: 200 });
  } catch (err) {
    console.error("❌ Error deleting:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
