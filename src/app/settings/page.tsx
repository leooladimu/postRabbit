"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

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

  async function handleCancelSubscription() {
    if (!confirm("Are you sure you want to cancel your subscription? You'll lose access to content generation.")) {
      return;
    }

    setCanceling(true);
    try {
      const res = await fetch("/api/stripe/cancel", { method: "POST" });
      const data = await res.json();
      
      if (data.success) {
        alert("Subscription canceled successfully.");
        setSubscribed(false);
      } else {
        alert("Failed to cancel subscription. Please contact support.");
      }
    } catch (error) {
      alert("Error canceling subscription. Please try again.");
    } finally {
      setCanceling(false);
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
        <Link href="/" style={{ textDecoration: "none" }}>
          <h1 style={{ cursor: "pointer" }}>🐇 postRabbit</h1>
        </Link>
        <UserButton />
      </div>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Settings</h1>
          <p>Manage your account and subscription.</p>
        </div>

        <div className="dashboard-card">
          <h2>Account</h2>
          <div style={{ marginBottom: "20px" }}>
            <p style={{ color: "var(--stone)", marginBottom: "8px" }}>Email: {user?.primaryEmailAddress?.emailAddress}</p>
            <p style={{ color: "var(--stone)" }}>Name: {user?.firstName} {user?.lastName}</p>
          </div>
        </div>

        <div className="dashboard-card" style={{ marginTop: "24px" }}>
          <h2>Subscription</h2>
          {subscribed ? (
            <div>
              <p style={{ color: "var(--stone)", marginBottom: "20px" }}>Status: <strong style={{ color: "var(--rust)" }}>Active</strong> ($40/month)</p>
              <button 
                onClick={handleCancelSubscription} 
                disabled={canceling}
                style={{ padding: "12px 24px", background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 500 }}
              >
                {canceling ? "Canceling..." : "Cancel Subscription"}
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: "var(--stone)", marginBottom: "20px" }}>Status: <strong>Inactive</strong></p>
              <Link href="/dashboard" style={{ padding: "12px 24px", background: "var(--rust)", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 500, textDecoration: "none", display: "inline-block" }}>
                Subscribe Now
              </Link>
            </div>
          )}
        </div>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <Link href="/dashboard" style={{ color: "var(--rust)", textDecoration: "none", fontWeight: 500 }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
