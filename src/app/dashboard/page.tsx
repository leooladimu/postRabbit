"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");
  const [copied, setCopied] = useState(false);
  const [contentHistory, setContentHistory] = useState<any[]>([]);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  
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
    async function fetchHistory() {
      try {
        const res = await fetch("/api/content/history");
        const data = await res.json();
        setContentHistory(data.posts || []);
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    }
    if (user) {
      checkSubscription();
      fetchHistory();
    }
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
    setCopied(false);
    
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      setGeneratedContent(data.content || "Failed to generate content");
      
      // Refresh history
      const historyRes = await fetch("/api/content/history");
      const historyData = await historyRes.json();
      setContentHistory(historyData.posts || []);
    } catch (error) {
      setGeneratedContent("Error generating content. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSelectPost(post: any) {
    setSelectedPost(post);
    setGeneratedContent(post.content);
    setCopied(false);
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
        <Link href="/" style={{ textDecoration: "none" }}>
          <h1 style={{ cursor: "pointer" }}>🐇 postRabbit</h1>
        </Link>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link href="/settings" style={{ color: "var(--bark)", textDecoration: "none", fontWeight: 500, fontSize: "0.95rem" }}>Settings</Link>
          <UserButton />
        </div>
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

          <button onClick={handleGenerate} disabled={!subscribed || generating}>
            {generating ? "Generating..." : "Generate Content"}
          </button>

          {generatedContent && (
            <div style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.2rem", color: "var(--bark)", margin: 0 }}>Generated Content</h3>
                <button onClick={handleCopy} style={{ padding: "8px 16px", background: copied ? "var(--terra)" : "var(--rust)", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.9rem", cursor: "pointer" }}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="generated-content">
                {generatedContent}
              </div>
            </div>
          )}
        </div>

        {contentHistory.length > 0 && (
          <div className="dashboard-card" style={{ marginTop: "24px" }}>
            <h2>Recent Content</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {contentHistory.slice(0, 5).map((post: any) => (
                <div 
                  key={post.id} 
                  onClick={() => handleSelectPost(post)}
                  style={{ 
                    padding: "16px", 
                    background: selectedPost?.id === post.id ? "var(--sand)" : "var(--cream)", 
                    borderRadius: "8px", 
                    border: selectedPost?.id === post.id ? "2px solid var(--rust)" : "1px solid var(--sand)",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    if (selectedPost?.id !== post.id) {
                      e.currentTarget.style.borderColor = "var(--terra)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPost?.id !== post.id) {
                      e.currentTarget.style.borderColor = "var(--sand)";
                    }
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--stone)", textTransform: "uppercase", fontWeight: 500 }}>{post.type.replace("_", " ")}</span>
                    <span style={{ fontSize: "0.85rem", color: "var(--stone)" }}>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p style={{ fontSize: "0.95rem", color: "var(--bark)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap", maxHeight: "100px", overflow: "hidden" }}>{post.content.substring(0, 200)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
