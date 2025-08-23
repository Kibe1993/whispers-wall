import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { pusher } from "@/lib/Pusher/pusher";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Save a new message
export async function POST(req: Request) {
  await connectDB();

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { message, topic } = body;

    const newMessage = await MessageModel.create({
      message,
      topic,
      clerkId: userId,
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date(),
    });

    // 👇 Trigger Pusher so all subscribed clients receive this
    await pusher.trigger(`topic-${topic}`, "new-message", newMessage);

    return NextResponse.json(newMessage, { status: 201 });
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
