import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, context: unknown) {
  const { params } = context as { params: { id: string } };
  await connectDB();
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 }
      );
    }

    const updatedMessage = await MessageModel.findByIdAndUpdate(
      params.id,
      { message }, // only update the parent message
      { new: true, runValidators: false } // ⬅️ disables full schema revalidation
    );

    if (!updatedMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(updatedMessage, { status: 200 });
  } catch (error) {
    console.error("❌ Error editing message:", error);
    return NextResponse.json(
      { error: "Failed to edit message" },
      { status: 500 }
    );
  }
}
