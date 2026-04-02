"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  
  const [formData, setFormData] = useState({
    businessName: "",
    location: "",
    keywords: "",
    contentType: "blog",
  });

  useEffect(() => {
    if (isLoaded && !user) {
      router.push("/");
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    async function checkSubscription() {
      try {
        const res = await fetch("/api/user/subscription");
        const data = await res.json();
        setSubscribed(data.subscribed);
      } catch (error) {
        console.error("Failed to check subscription:", error);
      } finally {
        setLoading(false);
      }
    }
    if (user) checkSubscription();
  }, [user]);

  async function handleSubscribe() {
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (error) {
      console.error("Subscription error:", error);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setGeneratedContent("");
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setGeneratedContent(data.content || "Failed to generate content");
    } catch (error) {
      setGeneratedContent("Error generating content. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <main className="dashboard">
        <div className="dashboard-container">
          <p>Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <div className="dashboard-nav">
        <h1>🐇 postRabbit</h1>
      </div>

      <div className="dashboard-container">
        {!subscribed && (
          <div className="subscription-banner">
            <h3>Subscribe to Start Generating Content</h3>
            <p>Get unlimited SEO content for $40/month. Cancel anytime.</p>
            <button onClick={handleSubscribe}>Subscribe Now</button>
          </div>
        )}

        <div className="dashboard-header">
          <h1>Welcome back, {user?.firstName || "there"}!</h1>
          <p>Generate SEO-optimized content for your business in seconds.</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h2>Generate Content</h2>
            
            <div className="form-group">
              <label>Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Your Business Name"
              />
            </div>

            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City, State"
              />
            </div>

            <div className="form-group">
              <label>Keywords</label>
              <input
                type="text"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="plumber, emergency repair, 24/7"
              />
            </div>

            <div className="form-group">
              <label>Content Type</label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
              >
                <option value="blog">Blog Post</option>
                <option value="meta">Meta Description</option>
                <option value="google_business">Google Business Update</option>
              </select>
            </div>

            <button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating..." : "Generate Content"}
            </button>

            {generatedContent && (
              <div className="generated-content">
                {generatedContent}
              </div>
            )}
          </div>

          <div className="dashboard-card">
            <h2>Recent Content</h2>
            <p>Your generated content will appear here. Start by generating your first piece!</p>
          </div>
        </div>
      </div>
    </main>
  );
}
