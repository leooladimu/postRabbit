import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { businessName, location, keywords, contentType } = await req.json();

    const prompt = buildPrompt(businessName, location, keywords, contentType);

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0].type === "text" ? message.content[0].text : "";

    await db.generatedPost.create({
      data: {
        userId: user.id,
        type: contentType,
        content,
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
