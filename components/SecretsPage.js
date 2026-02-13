"use client";
import { useState, useEffect, useRef } from "react";

const SECRETS = [
  {
    codename: "PHANTOM",
    hint: "What if your documents could talk to each other... across time?",
    category: "Intelligence",
    status: "Building",
    icon: "👻",
    color: "#A78BFA",
    detail: "Cross-temporal entity tracking. Upload documents from different years and watch how relationships evolve, dissolve, and transform.",
  },
  {
    codename: "ORACLE",
    hint: "Ask questions. Get answers. With receipts.",
    category: "AI Chat",
    status: "Testing",
    icon: "🔮",
    color: "#22D3EE",
    detail: "Conversational AI that answers questions about your uploaded documents — and cites exact pages, paragraphs, and connections as evidence.",
  },
  {
    codename: "HIVEMIND",
    hint: "One graph is powerful. A thousand graphs are dangerous.",
    category: "Collaboration",
    status: "Designing",
    icon: "🧠",
    color: "#F472B6",
    detail: "Team workspaces. Shared knowledge graphs. Real-time collaborative analysis with role-based permissions and audit trails.",
  },
  {
    codename: "SENTINEL",
    hint: "It watches your documents so you don't have to.",
    category: "Automation",
    status: "Researching",
    icon: "🛡️",
    color: "#FBBF24",
    detail: "Automated monitoring. Upload a watchlist of entities and get alerts when new documents mention them. Never miss a connection again.",
  },
  {
    codename: "CIPHER",
    hint: "Some patterns only emerge when you look at the negative space.",
    category: "Deep Analysis",
    status: "Prototyping",
    icon: "🔐",
    color: "#34D399",
    detail: "Anomaly detection. AI identifies what's missing from your documents — entities that should be connected but aren't. The gaps tell the real story.",
  },
  {
    codename: "ATLAS",
    hint: "PDFs are just the beginning.",
    category: "File Support",
    status: "Building",
    icon: "🗺️",
    color: "#60A5FA",
    detail: "Word docs, spreadsheets, emails, images with OCR, audio transcripts. Every file type becomes part of your unified knowledge graph.",
  },
  {
    codename: "PRISM",
    hint: "One document. Infinite perspectives.",
    category: "Visualization",
    status: "Designing",
    icon: "🔷",
    color: "#EC4899",
    detail: "Timeline view. Geographic map view. Hierarchical tree view. Matrix view. Choose how to see your data — each angle reveals something new.",
  },
  {
    codename: "EXODUS",
    hint: "Your intelligence, everywhere you need it.",
    category: "Export & API",
    status: "Planned",
    icon: "🚀",
    color: "#F97316",
    detail: "Export to Neo4j, CSV, JSON-LD, and more. Full REST API for developers. Webhook integrations. Embed graphs in your own applications.",
  },
];

function GlitchText({ text }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const interval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 150);
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(interval);
  }, []);

  if (!glitch) return <span>{text}</span>;
  const chars = "█▓░▒╬╫╪┼┤├";
  return (
    <span style={{ color: "#22D3EE" }}>
      {text.split("").map((c, i) => (Math.random() > 0.7 ? chars[Math.floor(Math.random() * chars.length)] : c)).join("")}
    </span>
  );
}

function ScanLine() {
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: "2px",
      background: "linear-gradient(90deg, transparent, #22D3EE44, transparent)",
      animation: "scanline 4s linear infinite", zIndex: 50, pointerEvents: "none",
    }} />
  );
}

export default function SecretsPage({ onBack }) {
  const [revealed, setRevealed] = useState({});
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setTimeout(() => setEntered(true), 100);
    const handleMouse = (e) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  return (
    <div style={{
      background: "#030308", color: "#E8E8ED", minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Courier New', monospace",
      position: "relative", overflow: "hidden",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      <ScanLine />

      {/* Cursor glow */}
      <div style={{
        position: "fixed", width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(34,211,238,0.04), transparent 70%)",
        left: mousePos.x - 150, top: mousePos.y - 150,
        pointerEvents: "none", zIndex: 1, transition: "left 0.1s, top 0.1s",
      }} />

      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      {/* Header */}
      <div style={{
        padding: "20px max(24px, 4vw)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        position: "relative", zIndex: 10,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.4)", padding: "6px 14px", borderRadius: 6,
          fontSize: 11, cursor: "pointer", fontFamily: "inherit",
          transition: "all 0.2s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)"; e.currentTarget.style.color = "#22D3EE"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}>
          ← Back
        </button>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", letterSpacing: 2 }}>
          CLASSIFIED // FILE XPLOR LABS
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 900, margin: "0 auto",
        padding: "60px max(24px, 4vw) 100px",
        position: "relative", zIndex: 2,
      }}>
        {/* Title block */}
        <div style={{
          marginBottom: 64, textAlign: "center",
          opacity: entered ? 1 : 0, transform: entered ? "translateY(0)" : "translateY(30px)",
          transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)",
        }}>
          <div style={{
            fontSize: 10, letterSpacing: 6, color: "rgba(34,211,238,0.5)",
            textTransform: "uppercase", marginBottom: 20,
          }}>
            ▸ ACCESS GRANTED
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 700,
            margin: "0 0 16px", letterSpacing: "-0.03em", lineHeight: 1.1,
          }}>
            <GlitchText text="What's Coming Next" />
          </h1>
          <p style={{
            fontSize: 14, color: "rgba(255,255,255,0.3)", maxWidth: 480,
            margin: "0 auto", lineHeight: 1.7,
          }}>
            You found this page. That means you're paying attention.
            Here's a glimpse at what we're building behind the curtain.
          </p>
          <div style={{
            marginTop: 20, fontSize: 11, color: "rgba(255,255,255,0.15)",
            display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
          }}>
            <span>◆ {SECRETS.length} projects in pipeline</span>
            <span>◆ {SECRETS.filter(s => s.status === "Building" || s.status === "Testing").length} actively building</span>
          </div>
        </div>

        {/* Secret cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SECRETS.map((secret, i) => {
            const isRevealed = revealed[i];
            return (
              <div
                key={i}
                onClick={() => setRevealed(r => ({ ...r, [i]: !r[i] }))}
                style={{
                  padding: "20px 24px", borderRadius: 12, cursor: "pointer",
                  background: isRevealed ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.015)",
                  border: `1px solid ${isRevealed ? secret.color + "33" : "rgba(255,255,255,0.04)"}`,
                  transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                  opacity: entered ? 1 : 0,
                  transform: entered ? "translateY(0)" : "translateY(20px)",
                  transitionDelay: `${0.05 * i}s`,
                }}
                onMouseEnter={(e) => { if (!isRevealed) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                onMouseLeave={(e) => { if (!isRevealed) e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontSize: 24 }}>{secret.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: secret.color, letterSpacing: 1 }}>
                        {secret.codename}
                      </span>
                      <span style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 10,
                        background: secret.status === "Testing" ? "rgba(34,211,238,0.12)" :
                                   secret.status === "Building" ? "rgba(52,211,153,0.12)" :
                                   "rgba(255,255,255,0.05)",
                        color: secret.status === "Testing" ? "#22D3EE" :
                               secret.status === "Building" ? "#34D399" :
                               "rgba(255,255,255,0.35)",
                        fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5,
                      }}>
                        {secret.status}
                      </span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", marginLeft: "auto" }}>
                        {secret.category}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 13, color: "rgba(255,255,255,0.45)",
                      margin: 0, lineHeight: 1.5,
                      fontStyle: "italic",
                    }}>
                      "{secret.hint}"
                    </p>
                  </div>
                  <span style={{
                    fontSize: 14, color: "rgba(255,255,255,0.15)",
                    transform: isRevealed ? "rotate(90deg)" : "rotate(0)",
                    transition: "transform 0.3s",
                  }}>▸</span>
                </div>

                {/* Revealed detail */}
                <div style={{
                  maxHeight: isRevealed ? 120 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
                }}>
                  <div style={{
                    marginTop: 16, paddingTop: 16,
                    borderTop: `1px solid ${secret.color}15`,
                  }}>
                    <p style={{
                      fontSize: 12, color: "rgba(255,255,255,0.5)",
                      margin: 0, lineHeight: 1.65,
                    }}>
                      {secret.detail}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div style={{
          marginTop: 64, textAlign: "center",
          padding: "40px 32px", borderRadius: 16,
          border: "1px dashed rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.01)",
        }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 3, marginBottom: 12, textTransform: "uppercase" }}>
            Want early access?
          </div>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 20px", maxWidth: 400, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Pro subscribers get first access to every new feature as it drops. Some are already live.
          </p>
          <button onClick={onBack} style={{
            padding: "10px 28px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            color: "#000", fontSize: 12, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.3s",
          }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
            Upgrade to Pro →
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
    </div>
  );
}
