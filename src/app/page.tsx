"use client";

export default function Home() {
  function handleSubmit() {
    const input = document.getElementById("emailInput") as HTMLInputElement;
    const email = input.value.trim();
    if (!email || !email.includes("@")) {
      input.focus();
      return;
    }
    (document.getElementById("waitlistForm") as HTMLElement).style.display = "none";
    (document.getElementById("successMsg") as HTMLElement).style.display = "block";
  }

  return (
    <>
      <section className="hero">
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

        <div className="waitlist" id="waitlistForm">
          <input
            type="email"
            id="emailInput"
            placeholder="your@email.com"
            autoComplete="email"
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          />
          <button onClick={handleSubmit}>Join the Waitlist</button>
        </div>

        <p className="price-note">
          Launching soon &nbsp;·&nbsp; <strong>$40 / month</strong> &nbsp;·&nbsp;
          No contracts. Cancel anytime.
        </p>
        <p className="success-msg" id="successMsg">
          🐇 &nbsp;You&apos;re on the list. We&apos;ll be in touch.
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
          <a href="mailto:hello@postrabbit.com">hello@postrabbit.com</a>
        </p>
      </footer>
    </>
  );
}
