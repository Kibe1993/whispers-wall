import { connectDB } from "@/lib/DB/connectDB";
import MessageModel from "@/lib/Models/message";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectDB();

    const counts = await MessageModel.aggregate([
      { $group: { _id: "$topic", count: { $sum: 1 } } },
    ]);

    const result: Record<string, number> = {};
    counts.forEach((c) => (result[c._id] = c.count));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching topic counts:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
