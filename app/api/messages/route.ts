import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Save a new message
export async function POST(req: Request) {
  await connectDB();
  console.log("✅ Database connected");

  const authResult = await auth();

  const { userId } = authResult || {};

  const body = await req.json();

  const { message, topic } = body;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const newMessage = await MessageModel.create({
      message,
      topic,
      clerkId: userId,
      createdAt: new Date(),
    });

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error("❌ Error creating message:", error);
    return NextResponse.json(
      { error: "Failed to save message" },
      { status: 500 }
    );
  }
}

// Get all messages by topic
export async function GET(req: Request) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const topic = searchParams.get("topic");

    if (!topic) {
      return NextResponse.json({ error: "Topic required" }, { status: 400 });
    }

    const messages = await MessageModel.find({ topic }).sort({ createdAt: 1 });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
