import { deleteFileFromCloudinary } from "@/lib/cloudinary/uploadImage";
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

    // Validate message content
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

    // ✅ Case 1: Editing a nested reply
    if (parentReplyId) {
      // Recursive function to locate and update reply
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

      // Trigger Pusher event so clients update in real time
      await pusher.trigger(`topic-${msg.topic}`, "update-message", savedMsg);

      return NextResponse.json(savedMsg, { status: 200 });
    }

    // ✅ Case 2: Editing the root message
    if (msg.clerkId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    msg.message = message;
    const savedMsg = await msg.save();

    // Notify clients about the update
    await pusher.trigger(`topic-${msg.topic}`, "update-message", savedMsg);

    return NextResponse.json(savedMsg, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to edit message",
      },
      { status: 500 }
    );
  }
}

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

function collectFilesFromReplies(replies: Reply[]): { public_id?: string }[] {
  let files: { public_id?: string }[] = [];

  for (const reply of replies) {
    if (reply.files && reply.files.length > 0) {
      files.push(...reply.files);
    }
    if (reply.replies && reply.replies.length > 0) {
      files.push(...collectFilesFromReplies(reply.replies as Reply[]));
    }
  }

  return files;
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

    // ✅ Case 1: Deleting a root message
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

      // Collect all files (root + replies)
      let allFiles: { public_id?: string }[] = [];
      if (msg.files && msg.files.length > 0) {
        allFiles.push(...msg.files);
      }
      if (msg.replies && msg.replies.length > 0) {
        allFiles.push(...collectFilesFromReplies(msg.replies as Reply[]));
      }

      // Delete attached files (Supabase + Cloudinary)
      for (const file of allFiles) {
        if (!file.public_id) continue;
        try {
          await deleteFileFromSupabase(file.public_id);
          await deleteFileFromCloudinary(file.public_id);
        } catch (err) {
          console.error(`❌ Failed to delete file ${file.public_id}:`, err);
        }
      }

      // Delete DB record
      await msg.deleteOne();

      // Notify clients
      await pusher.trigger(`topic-${msg.topic}`, "delete-message", {
        id,
        parentId: null,
      });

      return NextResponse.json({ success: true });
    }

    // ✅ Case 2: Deleting a nested reply
    const parent = await MessageModel.findById(parentId);
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const targetReply = findReplyRecursive(parent.replies as Reply[], id);
    if (!targetReply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    if (targetReply.clerkId !== userId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // ✅ Delete reply files (Cloudinary + Supabase)
    let replyFiles: { public_id?: string }[] = [];
    if (targetReply.files && targetReply.files.length > 0) {
      replyFiles.push(...targetReply.files);
    }
    if (targetReply.replies && targetReply.replies.length > 0) {
      replyFiles.push(
        ...collectFilesFromReplies(targetReply.replies as Reply[])
      );
    }

    for (const file of replyFiles) {
      if (!file.public_id) continue;
      try {
        await deleteFileFromSupabase(file.public_id);
        await deleteFileFromCloudinary(file.public_id);
      } catch (err) {
        console.error(`❌ Failed to delete reply file ${file.public_id}:`, err);
      }
    }

    // Remove the reply from nested structure
    const deleted = removeReplyRecursive(parent.replies as Reply[], id, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: "Reply not found or unauthorized" },
        { status: 404 }
      );
    }

    const savedParent = await parent.save();

    // Notify clients
    await pusher.trigger(
      `topic-${parent.topic}`,
      "update-message",
      savedParent
    );

    return NextResponse.json(savedParent, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete" },
      { status: 500 }
    );
  }
}
