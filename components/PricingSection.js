"use client";
import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";

export default function PricingSection({ onEnterApp, anim }) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleProUpgrade = async () => {
    if (!user) {
      onEnterApp();
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          annual: false,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Checkout error:", data.error);
        alert("Failed to start checkout. Please try again.");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      alert("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      desc: "See what File Xplor can do",
      color: "rgba(255,255,255,0.5)",
      bg: "rgba(255,255,255,0.02)",
      border: "rgba(255,255,255,0.06)",
      cta: "Get Started",
      ctaBg: "rgba(255,255,255,0.08)",
      ctaColor: "#fff",
      action: onEnterApp,
      features: [
        { text: "3 analyses per month", included: true },
        { text: "Up to 2 PDFs per analysis", included: true },
        { text: "Max 50 pages per PDF", included: true },
        { text: "Basic entity extraction", included: true },
        { text: "Network graph view", included: true },
        { text: "1 saved project", included: true },
        { text: "Community support", included: true },
        { text: "Multi-document merging", included: false },
        { text: "AI chat with documents", included: false },
        { text: "Export & API access", included: false },
        { text: "Priority processing", included: false },
      ],
    },
    {
      name: "Pro",
      price: "$9.99",
      period: "/mo",
      desc: "For professionals who live in documents",
      color: "#22D3EE",
      bg: "rgba(34,211,238,0.03)",
      border: "rgba(34,211,238,0.15)",
      cta: loading ? "Redirecting..." : "Start 7-Day Free Trial",
      ctaBg: "linear-gradient(135deg, #22D3EE, #A78BFA)",
      ctaColor: "#000",
      popular: true,
      action: handleProUpgrade,
      features: [
        { text: "Unlimited analyses", included: true, highlight: true },
        { text: "Up to 20 PDFs per analysis", included: true, highlight: true },
        { text: "No page limits", included: true, highlight: true },
        { text: "Advanced entity extraction", included: true },
        { text: "All visualization modes", included: true },
        { text: "Unlimited saved projects", included: true, highlight: true },
        { text: "Multi-document merging", included: true, highlight: true },
        { text: "AI chat with documents", included: true, highlight: true },
        { text: "Export (CSV, JSON, Neo4j)", included: true },
        { text: "Priority processing queue", included: true },
        { text: "Early access to new features", included: true },
      ],
    },
  ];

  return (
    <section id="pricing" style={{
      padding: "80px max(24px, 4vw) 100px", position: "relative", zIndex: 2,
    }}>
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Header */}
        <div {...(anim ? anim("pricing-title") : {})} style={{
          ...(anim ? anim("pricing-title").style : {}),
          textAlign: "center", marginBottom: 48,
        }}>
          <div style={{
            fontSize: 11, letterSpacing: 4, color: "#22D3EE",
            textTransform: "uppercase", marginBottom: 14, fontWeight: 600,
          }}>
            Pricing
          </div>
          <h2 style={{
            fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800,
            margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.15,
          }}>
            Start free. <span style={{ color: "rgba(255,255,255,0.3)" }}>Go pro when you're hooked.</span>
          </h2>
          <p style={{
            fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 440,
            margin: "0 auto", lineHeight: 1.6,
            fontFamily: "'Newsreader', serif", fontStyle: "italic",
          }}>
            Try everything with the free plan. Upgrade when you need more power.
          </p>
        </div>

        {/* Plan Cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 20, alignItems: "start",
        }}>
          {plans.map((plan, i) => (
            <div key={i} {...(anim ? anim(`plan-${i}`, i * 0.1) : {})} style={{
              ...(anim ? anim(`plan-${i}`, i * 0.1).style : {}),
              padding: "32px 28px", borderRadius: 18,
              background: plan.bg,
              border: `1px solid ${plan.border}`,
              position: "relative", overflow: "hidden",
              transition: "all 0.3s",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = plan.popular ? "rgba(34,211,238,0.3)" : "rgba(255,255,255,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = plan.border; }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div style={{
                  position: "absolute", top: 16, right: 16,
                  padding: "4px 10px", borderRadius: 20, fontSize: 9,
                  fontWeight: 700, letterSpacing: 0.5,
                  background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
                  color: "#000", textTransform: "uppercase",
                }}>Most Popular</div>
              )}

              {/* Plan name */}
              <div style={{
                fontSize: 14, fontWeight: 700, color: plan.color,
                textTransform: "uppercase", letterSpacing: 1, marginBottom: 4,
              }}>{plan.name}</div>

              {/* Price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 42, fontWeight: 800, color: "#fff", letterSpacing: -2 }}>{plan.price}</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>{plan.period}</span>
              </div>

              <p style={{
                fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "8px 0 24px",
                lineHeight: 1.5,
              }}>{plan.desc}</p>

              {/* CTA */}
              <button onClick={plan.action} disabled={loading && plan.popular} style={{
                width: "100%", padding: "12px 20px", borderRadius: 10,
                border: plan.popular ? "none" : "1px solid rgba(255,255,255,0.1)",
                background: plan.ctaBg, color: plan.ctaColor,
                fontSize: 13, fontWeight: 700, cursor: loading && plan.popular ? "wait" : "pointer",
                fontFamily: "inherit", transition: "all 0.3s", marginBottom: 28,
                boxShadow: plan.popular ? "0 4px 20px rgba(34,211,238,0.15)" : "none",
                opacity: loading && plan.popular ? 0.7 : 1,
              }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
                {plan.cta}
              </button>

              {/* Features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f, j) => (
                  <div key={j} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    opacity: f.included ? 1 : 0.3,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10,
                      background: f.included
                        ? (f.highlight ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.06)")
                        : "transparent",
                      color: f.included
                        ? (f.highlight ? "#22D3EE" : "rgba(255,255,255,0.5)")
                        : "rgba(255,255,255,0.2)",
                      border: f.included ? "none" : "1px solid rgba(255,255,255,0.08)",
                    }}>
                      {f.included ? "\u2713" : "\u2014"}
                    </span>
                    <span style={{
                      fontSize: 12.5,
                      color: f.highlight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.5)",
                      fontWeight: f.highlight ? 600 : 400,
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <div style={{
          textAlign: "center", marginTop: 32,
          fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.6,
        }}>
          All plans include SSL encryption and secure document processing.
          <br />Pro trial is 7 days free, cancel anytime. No questions asked.
        </div>
      </div>
    </section>
  );
}