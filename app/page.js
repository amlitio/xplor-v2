"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import LandingPage from "@/components/LandingPage";
import SecretsPage from "@/components/SecretsPage";
import AuthScreen from "@/components/AuthScreen";
import ProjectsDashboard from "@/components/ProjectsDashboard";
import UploadScreen from "@/components/UploadScreen";
import Explorer from "@/components/Explorer";
import SkillGraphUpload from "@/components/SkillGraphUpload";

export default function Home() {
  const { user, loading } = useAuth();
  // auto | auth | landing | secrets | projects | mode_select | upload | skill_upload | explorer
  const [screen, setScreen] = useState("auto");
  const [explorerData, setExplorerData] = useState(null);

  // Global callbacks for navigation from any component
  useEffect(() => {
    window.__showSecrets = () => setScreen("secrets");
    window.__showLanding = () => setScreen(user ? "landing" : "auto");
    window.__showProjects = () => setScreen("projects");
    return () => {
      delete window.__showSecrets;
      delete window.__showLanding;
      delete window.__showProjects;
    };
  }, [user]);

  // When user logs in, go to projects
  useEffect(() => {
    if (user && (screen === "auto" || screen === "auth")) {
      setScreen("projects");
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#06060B", color: "rgba(255,255,255,0.4)", fontSize: 14,
        fontFamily: "'Outfit', sans-serif",
      }}>
        <div className="grid-bg" />
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#000",
          }}>{"\u25c6"}</div>
          Loading...
        </div>
      </div>
    );
  }

  // Secrets page (works for both logged-in and logged-out users)
  if (screen === "secrets") {
    return <SecretsPage onBack={() => setScreen(user ? "projects" : "auto")} />;
  }

  // Landing page for logged-in users who clicked "Home"
  if (user && screen === "landing") {
    return <LandingPage onEnterApp={() => setScreen("projects")} />;
  }

  // Landing page for unauthenticated visitors
  if (!user && screen === "auto") {
    return <LandingPage onEnterApp={() => setScreen("auth")} />;
  }

  // Auth screen
  if (!user) {
    return (
      <>
        <div className="grid-bg" />
        <AuthScreen />
      </>
    );
  }

  // Explorer view
  if (screen === "explorer" && explorerData) {
    return (
      <Explorer
        data={explorerData}
        onBack={() => { setScreen("projects"); setExplorerData(null); }}
      />
    );
  }

  // Upload view (Document Mode)
  if (screen === "upload") {
    return (
      <>
        <div className="grid-bg" />
        <UploadScreen
          onComplete={(data) => {
            setExplorerData(data);
            setScreen("explorer");
          }}
        />
      </>
    );
  }

  // Skill Graph Upload view
  if (screen === "skill_upload") {
    return (
      <>
        <div className="grid-bg" />
        <div style={{ minHeight: "100vh", background: "#0A0A0F" }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
            position: "sticky", top: 0, zIndex: 100,
          }}>
            <button
              onClick={() => setScreen("mode_select")}
              style={{
                padding: "6px 14px", borderRadius: 6,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent", color: "rgba(255,255,255,0.4)",
                fontSize: 12, cursor: "pointer", fontFamily: "'Outfit', sans-serif",
              }}
            >← Back</button>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, fontWeight: 800, color: "#000",
              }}>◆</div>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block", fontFamily: "'Space Grotesk', sans-serif" }}>Skill Graph Mode</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "block" }}>Markdown → Intelligence Graph</span>
              </div>
            </div>
            <div style={{ width: 60 }} />
          </div>
          <SkillGraphUpload
            onGraphReady={(graph) => {
              setExplorerData(graph);
              setScreen("explorer");
            }}
          />
        </div>
      </>
    );
  }

  // Mode select screen
  if (screen === "mode_select") {
    return (
      <>
        <div className="grid-bg" />
        <ModeSelectScreen
          onSelectMode={(mode) => {
            if (mode === "document") setScreen("upload");
            else setScreen("skill_upload");
          }}
          onBack={() => setScreen("projects")}
        />
      </>
    );
  }

  // Projects dashboard (default for logged-in users)
  return (
    <>
      <div className="grid-bg" />
      <ProjectsDashboard
        onNewProject={() => setScreen("mode_select")}
        onOpenProject={(project) => {
          setExplorerData(project);
          setScreen("explorer");
        }}
        onGoHome={() => setScreen("landing")}
        onGoSecrets={() => setScreen("secrets")}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Mode Select Screen (the only new UI component)
// ---------------------------------------------------------------------------

function ModeSelectScreen({ onSelectMode, onBack }) {
  const [hovered, setHovered] = useState(null);

  const modes = [
    {
      id: "document",
      icon: "📄",
      title: "Analyze Documents",
      subtitle: "PDF → Knowledge Graph",
      desc: "Upload PDFs. Claude extracts people, organizations, locations, dates, concepts, and relationships — rendered as an interactive graph.",
      features: ["AI entity extraction", "Up to 10 PDFs", "Share & explore publicly"],
      color: "#FF6B6B",
    },
    {
      id: "skill",
      icon: "🧠",
      title: "Explore Skill Graph",
      subtitle: "Markdown + Wikilinks → Intelligence Graph",
      desc: "Upload a ZIP of Markdown files connected with [[wikilinks]]. Parses frontmatter, extracts link context, builds a typed knowledge graph — all client-side.",
      features: ["Client-side parsing", "YAML frontmatter + wikilinks", "Quality scoring"],
      color: "#EE5A24",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", padding: "20px 32px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={onBack}
          style={{
            padding: "6px 14px", borderRadius: 6,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "transparent", color: "rgba(255,255,255,0.4)",
            fontSize: 12, cursor: "pointer",
          }}
        >← Back</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h2 style={{
            fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.95)",
            fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 4px",
          }}>Choose a Mode</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0 }}>
            What kind of knowledge do you want to explore?
          </p>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Mode cards */}
      <div style={{
        maxWidth: 800, margin: "40px auto", padding: "0 24px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20,
      }}>
        {modes.map((mode) => {
          const isH = hovered === mode.id;
          return (
            <button
              key={mode.id}
              onMouseEnter={() => setHovered(mode.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelectMode(mode.id)}
              style={{
                padding: 28, borderRadius: 16, textAlign: "left",
                cursor: "pointer", transition: "all 0.2s",
                display: "flex", flexDirection: "column", gap: 16,
                fontFamily: "'Outfit', sans-serif",
                border: `1px solid ${isH ? mode.color + "40" : "rgba(255,255,255,0.06)"}`,
                background: isH ? mode.color + "0A" : "rgba(255,255,255,0.03)",
                transform: isH ? "translateY(-2px)" : "none",
              }}
            >
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: mode.color + "18", border: `1px solid ${mode.color}30`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22,
              }}>{mode.icon}</div>

              {/* Title + subtitle */}
              <div>
                <h3 style={{
                  fontSize: 20, fontWeight: 800, color: mode.color,
                  fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 4px",
                }}>{mode.title}</h3>
                <p style={{
                  fontSize: 11, fontWeight: 600, color: mode.color + "99",
                  margin: 0,
                }}>{mode.subtitle}</p>
              </div>

              {/* Description */}
              <p style={{
                fontSize: 13, color: "rgba(255,255,255,0.45)",
                margin: 0, lineHeight: 1.6,
              }}>{mode.desc}</p>

              {/* Features */}
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {mode.features.map((f) => (
                  <li key={f} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center" }}>
                    <span style={{ color: mode.color, marginRight: 6 }}>✓</span>{f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div style={{
                padding: "11px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700,
                textAlign: "center", marginTop: 4, transition: "all 0.2s",
                background: isH ? `linear-gradient(135deg, ${mode.color}, #4ECDC4)` : "transparent",
                border: isH ? "none" : `1px solid ${mode.color}40`,
                color: isH ? "#000" : mode.color,
              }}>
                {mode.id === "document" ? "Upload PDFs →" : "Upload ZIP →"}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{
        textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)",
        margin: 0, padding: "0 24px 40px",
      }}>
        Both modes produce the same graph format — explore with the same Explorer UI.
      </p>
    </div>
  );
}
