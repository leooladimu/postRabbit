import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await prisma.user.findUnique({ where: { clerkId: userId } });
    
    if (!user) {
      const userData = await clerkClient().users.getUser(userId);
      
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
