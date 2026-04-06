import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let user = await db.user.findUnique({ where: { clerkId: userId } });

    // Fallback: find by email and update clerkId (handles test→live Clerk key migration)
    if (!user) {
      const client = await clerkClient();
      const userData = await client.users.getUser(userId);
      const email = userData.emailAddresses[0]?.emailAddress || "";

      const existingByEmail = await db.user.findUnique({ where: { email } });
      if (existingByEmail) {
        user = await db.user.update({
          where: { email },
          data: { clerkId: userId },
        });
      }
    }

    if (!user || !user.subscribed) {
      return NextResponse.json({ error: "Subscription required" }, { status: 403 });
    }

    const { businessName, location, keywords, contentType } = await req.json();

    const prompt = buildPrompt(businessName, location, keywords, contentType);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0].type === "text" ? message.content[0].text : "";

    await db.generatedPost.create({
      data: {
        userId: user.id,
        type: contentType,
        content,
        businessName,
        location,
        keywords,
      },
    });

    return NextResponse.json({ content });
  } catch (error: any) {
    console.error("Content generation error:", error);
    return NextResponse.json({ error: error?.message || "Failed to generate content" }, { status: 500 });
  }
}

function buildPrompt(businessName: string, location: string, keywords: string, contentType: string): string {
  const keywordList = keywords.split(",").map(k => k.trim());
  
  if (contentType === "meta") {
    return `Write a compelling meta description (150-160 characters) for ${businessName}, a business in ${location} that specializes in ${keywordList.join(", ")}. Focus on local SEO and include a call to action.`;
  }
  
  if (contentType === "google_business") {
    return `Write a Google Business Profile update (under 1500 characters) for ${businessName} in ${location}. Highlight services: ${keywordList.join(", ")}. Make it engaging, local, and include relevant hashtags.`;
  }
  
  return `Write a 400-500 word SEO-optimized blog post for ${businessName}, a business in ${location}. Focus on the topic: ${keywordList[0]}. Include these related keywords naturally: ${keywordList.slice(1).join(", ")}. Write in a professional but approachable tone. Include a clear headline and structure with subheadings.`;
}
