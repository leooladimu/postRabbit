import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const waitlistEntry = await prisma.waitlist.create({
      data: { email },
    });

    return NextResponse.json({ success: true, id: waitlistEntry.id });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to save email" }, { status: 500 });
  }
}
