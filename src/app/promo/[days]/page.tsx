"use client";

import { useParams, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

const ALLOWED_DAYS = [7, 14, 30];

export default function PromoPage() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState(false);

  const rawDays = Number(params.days);
  const days = ALLOWED_DAYS.includes(rawDays) ? rawDays : 30;

  async function handleStartTrial() {
    if (!isSignedIn) {
      // Send to sign-up, then they'll come back to this page
      router.push(`/sign-up?redirect_url=/promo/${days}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/stripe/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      console.error("Failed to start trial");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded) {
    return (
      <main className="hero" style={{ minHeight: "100vh" }}>
        <p style={{ color: "var(--bark)" }}>Loading...</p>
      </main>
    );
  }

  return (
    <>
      <section className="hero">
        <div
          style={{
            position: "absolute",
            top: "20px",
            right: "20px",
            zIndex: 10,
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {isSignedIn ? (
            <>
              <Link
                href="/dashboard"
                style={{
                  padding: "10px 20px",
                  background: "var(--bark)",
                  color: "#fff",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.95rem",
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Dashboard
              </Link>
              <UserButton />
            </>
          ) : (
            <Link
              href="/sign-in"
              style={{
                padding: "10px 20px",
                background: "var(--rust)",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                fontSize: "0.95rem",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Sign In
            </Link>
          )}
        </div>

        <div className="logo-wrap">
          <img
            src="/postrabbit-logo.png"
            alt="postRabbit — Create. Post. Grow."
          />
        </div>

        <h1 className="hero-headline">
          Try postRabbit free
          <br />
          <em>for {days} days.</em>
        </h1>

        <p className="hero-sub">
          Generate optimized blog posts, meta descriptions, and Google Business
          updates tailored to your local market — no credit card required.
        </p>

        <button
          onClick={handleStartTrial}
          disabled={loading}
          style={{
            padding: "18px 48px",
            background: loading ? "var(--stone)" : "var(--rust)",
            color: "#fff",
            border: "none",
            borderRadius: "60px",
            cursor: loading ? "default" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            fontSize: "1.1rem",
            fontWeight: 600,
            boxShadow: "0 8px 40px rgba(100, 30, 0, 0.18)",
            transition: "background 0.2s",
          }}
        >
          {loading
            ? "Setting up your trial..."
            : isSignedIn
              ? `Start Your ${days}-Day Free Trial`
              : `Sign Up & Start Your ${days}-Day Free Trial`}
        </button>

        <p className="price-note">
          Then <strong>$40 / month</strong> &nbsp;·&nbsp; No contracts. Cancel
          anytime.
        </p>

        <div className="hills">
          <svg
            viewBox="0 0 1440 120"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
          >
            <path
              d="M0,80 C240,20 480,120 720,60 C960,0 1200,100 1440,50 L1440,120 L0,120 Z"
              fill="#3D1A06"
              opacity="0.12"
            />
            <path
              d="M0,100 C360,40 720,110 1080,70 C1260,50 1380,90 1440,80 L1440,120 L0,120 Z"
              fill="#5C2E0E"
              opacity="0.08"
            />
          </svg>
        </div>
      </section>

      <section className="features">
        <div className="features-inner">
          <div className="feature">
            <div className="feature-icon">✍️</div>
            <h3>Content That Converts</h3>
            <p>
              Blog posts, meta descriptions, and Google Business updates written
              around your keywords, your location, and your voice — ready to
              publish.
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon">📈</div>
            <h3>Save &amp; Organize</h3>
            <p>
              Every piece of content is saved with your business details and
              keywords — so you can revisit, reuse, and build on what works.
            </p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Built for Local Business</h3>
            <p>
              Not a generic content mill. postRabbit knows your market, your
              customers, and the search terms that bring them through your door.
            </p>
          </div>
        </div>
      </section>

      <div className="band">
        <p>
          &ldquo;If you&apos;re waiting for a corporation to give you permission
          to work, you&apos;re standing in the wrong line.&rdquo;
        </p>
        <p
          style={{
            marginTop: "12px",
            fontSize: "0.95rem",
            fontStyle: "normal",
            opacity: 0.8,
          }}
        >
          — Sabrina Romanov
        </p>
      </div>

      <footer>
        <p>
          &copy; 2026 postRabbit &nbsp;·&nbsp;
          <a href="mailto:leo@oleo.dev">leo@oleo.dev</a>
        </p>
      </footer>
    </>
  );
}
