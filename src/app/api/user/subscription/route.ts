import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    
    if (!user) {
      const clerkUser = await (await import("@clerk/nextjs/server")).clerkClient();
      const userData = await clerkUser.users.getUser(userId);
      
      user = await prisma.user.create({
        data: {
          clerkId: userId,
          email: userData.emailAddresses[0]?.emailAddress || "",
        },
      });
    }

    return NextResponse.json({ subscribed: user.subscribed });
  } catch (error) {
    console.error("Subscription check error:", error);
    return NextResponse.json({ error: "Failed to check subscription" }, { status: 500 });
  }
}
