import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PrismaClient } from "@/generated/prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!user || !user.subscribed) {
      return NextResponse.json({ error: "Subscription required" }, { status: 403 });
    }

    const { businessName, location, keywords, contentType } = await req.json();

    // TODO: Replace with actual Anthropic API call when ANTHROPIC_API_KEY is set
    const mockContent = generateMockContent(businessName, location, keywords, contentType);

    await prisma.generatedPost.create({
      data: {
        userId: user.id,
        type: contentType,
        content: mockContent,
      },
    });

    return NextResponse.json({ content: mockContent });
  } catch (error) {
    console.error("Content generation error:", error);
    return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
  }
}

function generateMockContent(businessName: string, location: string, keywords: string, contentType: string): string {
  const keywordList = keywords.split(",").map(k => k.trim());
  
  if (contentType === "meta") {
    return `${businessName} in ${location} - Expert ${keywordList[0]} services. ${keywordList.slice(1).join(", ")}. Call today for a free quote!`;
  }
  
  if (contentType === "google_business") {
    return `🔧 New update from ${businessName}!\n\nLooking for ${keywordList[0]} in ${location}? We're here to help! Our team specializes in ${keywordList.join(", ")}.\n\nCall us today or visit our website to learn more. #${location.replace(/\s+/g, "")} #${keywordList[0].replace(/\s+/g, "")}`;
  }
  
  return `# ${keywordList[0].charAt(0).toUpperCase() + keywordList[0].slice(1)} Services in ${location}\n\nWhen you need ${keywordList[0]} in ${location}, ${businessName} is your trusted local expert. We understand the unique needs of ${location} residents and businesses.\n\n## Why Choose ${businessName}?\n\nOur team brings years of experience in ${keywordList.join(", ")}. We're committed to providing top-quality service that keeps your business running smoothly.\n\n## Our Services\n\n- ${keywordList.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join("\n- ")}\n\nContact ${businessName} today to learn how we can help with your ${keywordList[0]} needs in ${location}.`;
}
