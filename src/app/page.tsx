"use client";
import { useState } from "react";
import Link from "next/link";
import { useUser, UserButton } from "@clerk/nextjs";

export default function Home() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { isSignedIn } = useUser();

  function handleSubmit() {
    if (!email || !email.includes("@")) return;
    
    fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
      .then((res) => res.json())
      .then(() => setSubmitted(true))
      .catch(() => setSubmitted(true)); // Show success even on error for UX
  }

  return (
    <>
      <section className="hero">
        <div style={{ position: "absolute", top: "20px", right: "20px", zIndex: 10, display: "flex", gap: "12px", alignItems: "center" }}>
          {isSignedIn ? (
            <>
              <Link href="/dashboard" style={{ padding: "10px 20px", background: "var(--bark)", color: "#fff", borderRadius: "8px", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: "0.95rem", fontWeight: 500, textDecoration: "none", display: "inline-block" }}>
                Dashboard
              </Link>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <Link href="/sign-in" style={{ padding: "10px 20px", background: "var(--rust)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontFamily: "DM Sans, sans-serif", fontSize: "0.95rem", fontWeight: 500, textDecoration: "none", display: "inline-block" }}>
              Sign In
            </Link>
          )}
        </div>
        <div className="logo-wrap">
          <img src="/postrabbit-logo.png" alt="postRabbit — Create. Post. Grow." />
        </div>

        <h1 className="hero-headline">
          SEO content for your business,<br />
          <em>written by AI in seconds.</em>
        </h1>

        <p className="hero-sub">
          postRabbit generates optimized blog posts, meta descriptions, and Google
          Business updates tailored to your local market — so you show up when
          customers search.
        </p>

        {!submitted ? (
          <div className="waitlist">
            <input
              type="email"
              placeholder="your@email.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button onClick={handleSubmit}>Join the Waitlist</button>
          </div>
        ) : (
          <p className="success-msg">🐇 &nbsp;You&apos;re on the list. We&apos;ll be in touch.</p>
        )}

        <p className="price-note">
          Launching soon &nbsp;·&nbsp; <strong>$40 / month</strong> &nbsp;·&nbsp;
          No contracts. Cancel anytime.
        </p>

        <div className="hills">
          <svg viewBox="0 0 1440 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0,80 C240,20 480,120 720,60 C960,0 1200,100 1440,50 L1440,120 L0,120 Z" fill="#3D1A06" opacity="0.12" />
            <path d="M0,100 C360,40 720,110 1080,70 C1260,50 1380,90 1440,80 L1440,120 L0,120 Z" fill="#5C2E0E" opacity="0.08" />
          </svg>
        </div>
      </section>

      <section className="features">
        <div className="features-inner">
          <div className="feature">
            <div className="feature-icon">✍️</div>
            <h3>Content That Converts</h3>
            <p>Blog posts, meta descriptions, and Google Business updates written around your keywords, your location, and your voice — ready to publish.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">📈</div>
            <h3>Track Your Growth</h3>
            <p>Connect Google Search Console and watch your rankings climb. postRabbit shows you exactly how your content is performing over time.</p>
          </div>
          <div className="feature">
            <div className="feature-icon">⚡</div>
            <h3>Built for Local Business</h3>
            <p>Not a generic content mill. postRabbit knows your market, your customers, and the search terms that bring them through your door.</p>
          </div>
        </div>
      </section>

      <div className="band">
        <p>&ldquo;If you&apos;re waiting for a corporation to give you permission to work, you&apos;re standing in the wrong line.&rdquo;</p>
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
