"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user } = useAuth();
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (user && sessionId) {
      setDoc(doc(db, "users", user.uid), {
        pro: true,
        upgradedAt: new Date().toISOString(),
        stripeSessionId: sessionId,
      }, { merge: true }).then(() => {
        setVerified(true);
      }).catch((err) => {
        console.error("Failed to update pro status:", err);
        setVerified(true);
      });
    } else if (user) {
      setVerified(true);
    }
  }, [user, sessionId]);

  const features = [
    { icon: "\u267e\ufe0f", title: "Unlimited Analyses", desc: "No more monthly limits \u2014 analyze as many documents as you need" },
    { icon: "\ud83e\udde0", title: "AI Document Chat", desc: "Ask AI questions about your documents, find patterns, get predictions" },
    { icon: "\ud83d\udcc2", title: "Multi-Document Merging", desc: "Upload up to 20 PDFs per analysis and merge entity graphs" },
    { icon: "\ud83d\udcca", title: "Advanced Visualizations", desc: "Timeline, geographic, tree, and matrix views coming soon" },
    { icon: "\ud83d\udce4", title: "Export Everywhere", desc: "Export to CSV, JSON, and Neo4j graph database format" },
    { icon: "\u26a1", title: "Priority Processing", desc: "Your analyses are processed first \u2014 no waiting in queue" },
    { icon: "\ud83d\udd13", title: "No Page Limits", desc: "Analyze documents of any size with no page restrictions" },
    { icon: "\ud83d\ude80", title: "Early Access", desc: "Be first to try new features from our Secrets roadmap" },
  ];

  return (
    <>
      <div style={{
        position: "absolute", top: -200, left: "50%", transform: "translateX(-50%)",
        width: 600, height: 600,
        background: "radial-gradient(circle, rgba(34,211,238,0.08), rgba(167,139,250,0.05), transparent 70%)",
        pointerEvents: "none",
      }} />

      {[...Array(20)].map((_, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${Math.random() * 60}%`,
          left: `${Math.random() * 100}%`,
          width: Math.random() * 4 + 2,
          height: Math.random() * 4 + 2,
          borderRadius: "50%",
          background: ["#22D3EE", "#A78BFA", "#34D399", "#F472B6", "#FBBF24"][i % 5],
          opacity: 0.3,
          animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
          animationDelay: `${Math.random() * 2}s`,
        }} />
      ))}

      <div style={{
        width: 80, height: 80, borderRadius: 20, marginBottom: 24,
        background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 36, boxShadow: "0 0 60px rgba(34,211,238,0.2)",
        animation: "scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative", zIndex: 1,
      }}>
        {"\u2728"}
      </div>

      <h1 style={{
        fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 800,
        margin: "0 0 8px", textAlign: "center", letterSpacing: -1,
        animation: "fadeUp 0.6s ease 0.1s both",
        position: "relative", zIndex: 1,
      }}>
        Welcome to{" "}
        <span style={{
          background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>Pro!</span>
      </h1>

      <p style={{
        fontSize: 16, color: "rgba(255,255,255,0.45)", textAlign: "center",
        maxWidth: 420, margin: "0 0 48px", lineHeight: 1.6,
        animation: "fadeUp 0.6s ease 0.2s both",
        position: "relative", zIndex: 1,
      }}>
        Your account has been upgraded. Here's everything you just unlocked:
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        gap: 14, maxWidth: 800, width: "100%", marginBottom: 48,
        position: "relative", zIndex: 1,
      }}>
        {features.map((f, i) => (
          <div key={i} style={{
            padding: "20px 18px", borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            animation: `fadeUp 0.5s ease ${0.3 + i * 0.06}s both`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{f.title}</div>
            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <a href="/" style={{
        padding: "14px 36px", borderRadius: 12, border: "none",
        background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
        color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer",
        textDecoration: "none", fontFamily: "inherit",
        boxShadow: "0 4px 30px rgba(34,211,238,0.2)",
        animation: "fadeUp 0.6s ease 0.8s both",
        position: "relative", zIndex: 1,
        transition: "all 0.3s",
      }}>
        Start Exploring {"\u2192"}
      </a>
    </>
  );
}

export default function SuccessPage() {
  return (
    <div style={{
      minHeight: "100vh", background: "#030308", color: "#E8E8ED",
      fontFamily: "'Sora', 'Space Grotesk', sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "60px 24px 80px", position: "relative", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      <Suspense fallback={
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>Loading...</div>
      }>
        <SuccessContent />
      </Suspense>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.5); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
}