"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function PromoPage() {
  const { isLoaded, isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState("");
  const canceled = searchParams.get("canceled") === "true";

  async function handleActivate() {
    setActivating(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/promo", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Failed to start trial. Please try again.");
    } finally {
      setActivating(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", background: "var(--cream)", position: "relative", zIndex: 1 }}>
      <Link href="/" style={{ textDecoration: "none", marginBottom: "40px" }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "2rem", color: "var(--bark)", cursor: "pointer" }}><img src="/jackrabbit.png" alt="postRabbit" style={{ width: "72px", height: "72px", verticalAlign: "middle", marginRight: "8px" }} />postRabbit</h1>
      </Link>

      <div style={{ background: "#fff", borderRadius: "16px", padding: "48px 40px", maxWidth: "520px", width: "100%", textAlign: "center", boxShadow: "0 4px 24px rgba(100, 30, 0, 0.1)", border: "1px solid var(--sand)" }}>
        <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🎁</div>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "1.8rem", color: "var(--bark)", marginBottom: "12px" }}>
          30 Days Free
        </h2>
        <p style={{ color: "var(--stone)", lineHeight: 1.7, marginBottom: "8px" }}>
          You&apos;ve been invited to try postRabbit — AI-powered SEO content for your local business.
        </p>
        <p style={{ color: "var(--stone)", lineHeight: 1.7, marginBottom: "32px", fontSize: "0.95rem" }}>
          Get 30 days of full access, completely free. No charge until your trial ends.
        </p>

        {canceled && (
          <p style={{ color: "var(--rust)", marginBottom: "16px", fontWeight: 500 }}>
            Checkout was canceled. You can try again below.
          </p>
        )}

        {error && (
          <p style={{ color: "#dc2626", marginBottom: "16px", fontWeight: 500 }}>
            {error}
          </p>
        )}

        {isLoaded && isSignedIn ? (
          <button
            onClick={handleActivate}
            disabled={activating}
            style={{
              padding: "16px 40px",
              background: "var(--rust)",
              color: "#fff",
              border: "none",
              borderRadius: "60px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "1.1rem",
              fontWeight: 600,
              cursor: activating ? "not-allowed" : "pointer",
              opacity: activating ? 0.7 : 1,
              transition: "background 0.2s",
              boxShadow: "0 8px 40px rgba(100, 30, 0, 0.18)",
            }}
          >
            {activating ? "Setting up your trial..." : "Start My Free Trial"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", alignItems: "center" }}>
            <Link
              href="/sign-up?redirect_url=/promo"
              style={{
                padding: "16px 40px",
                background: "var(--rust)",
                color: "#fff",
                border: "none",
                borderRadius: "60px",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: "1.1rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-block",
                boxShadow: "0 8px 40px rgba(100, 30, 0, 0.18)",
                transition: "background 0.2s",
              }}
            >
              Create Account &amp; Start Trial
            </Link>
            <p style={{ fontSize: "0.9rem", color: "var(--stone)" }}>
              Already have an account?{" "}
              <Link href="/sign-in?redirect_url=/promo" style={{ color: "var(--rust)", textDecoration: "none", fontWeight: 500 }}>
                Sign in
              </Link>
            </p>
          </div>
        )}

        <p style={{ marginTop: "24px", fontSize: "0.85rem", color: "var(--stone)" }}>
          $40/month after trial · Cancel anytime
        </p>
      </div>
    </main>
  );
}
