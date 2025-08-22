import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  await connectDB();

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const action = "dislike";

    let updateQuery = {};

    if (action === "dislike") {
      updateQuery = {
        $addToSet: { dislikes: userId },
      };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updated = await MessageModel.findByIdAndUpdate(id, updateQuery, {
      new: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("❌ Error updating like/dislike:", error);
    return NextResponse.json(
      { error: "Failed to update like/dislike" },
      { status: 500 }
    );
  }
}
