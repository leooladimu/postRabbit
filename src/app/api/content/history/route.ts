import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveUser } from "@/lib/resolve-user";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await resolveUser(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const posts = await db.generatedPost.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Failed to fetch content history:", error);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}
