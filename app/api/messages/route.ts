import { uploadImageToCloudinary } from "@/lib/cloudinary/uploadImage";
import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { pusher } from "@/lib/Pusher/pusher";
import { uploadFileToSupabase } from "@/lib/supabase/supabase";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  await connectDB();

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const message = formData.get("message") as string;
    const topic = formData.get("topic") as string;
    const files = formData.getAll("files") as File[];

    let uploadedFiles: {
      url: string;
      name: string;
      type: string;
      public_id: string;
    }[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const filename = file.name || uuidv4();

      let uploadedFile: {
        url: string;
        name: string;
        type: string;
        public_id: string;
      };

      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        const uploaded = await uploadImageToCloudinary(
          buffer,
          filename,
          `topics/${topic}`
        );
        uploadedFile = {
          url: uploaded.url,
          public_id: uploaded.public_id,
          name: filename,
          type: file.type,
        };
      } else {
        const { url, public_id } = await uploadFileToSupabase(
          buffer,
          filename,
          `topics/${topic}`
        );

        uploadedFile = {
          url,
          public_id,
          name: filename,
          type: file.type,
        };
      }

      uploadedFiles.push(uploadedFile);
    }

    if (!message && uploadedFiles.length === 0) {
      return NextResponse.json(
        { error: "Message must have text or at least one file" },
        { status: 400 }
      );
    }

    const newMessage = await MessageModel.create({
      message,
      topic,
      clerkId: userId,
      files: uploadedFiles,
      likes: [],
      dislikes: [],
      replies: [],
      createdAt: new Date(),
    });

    await pusher.trigger(`topic-${topic}`, "new-message", newMessage);

    return NextResponse.json(newMessage, { status: 201 });
  } catch {
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

    const messages = await MessageModel.find({ topic })
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json(messages, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
