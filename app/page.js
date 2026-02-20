"use client";

// app/page.js
// Root page — screen router for Xplor
// Screens: landing → auth → dashboard → [mode select] → upload → explorer
//
// NEW: Mode selector added between dashboard and upload.
// Modes: "📄 Analyze Documents" (existing) and "🧠 Explore Skill Graph" (new)
//
// This file is a drop-in replacement. It assumes:
//   - components/AuthScreen.js          (existing)
//   - components/ProjectsDashboard.js   (existing)
//   - components/UploadScreen.js        (existing Document Mode upload)
//   - components/Explorer.js            (existing — already handles kind:"skill" per explorer-architecture.md)
//   - components/SkillGraphUpload.js    (new — this sprint)
//   - lib/AuthContext.js                (existing)

import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import AuthScreen from "../components/AuthScreen";
import ProjectsDashboard from "../components/ProjectsDashboard";
import UploadScreen from "../components/UploadScreen";
import Explorer from "../components/Explorer";
import SkillGraphUpload from "../components/SkillGraphUpload";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCREENS = {
  LANDING: "landing",
  AUTH: "auth",
  DASHBOARD: "dashboard",
  MODE_SELECT: "mode_select",
  DOC_UPLOAD: "doc_upload",
  SKILL_UPLOAD: "skill_upload",
  EXPLORER: "explorer",
};

const MODES = {
  DOCUMENT: "document",
  SKILL: "skill",
};

// Design tokens (matches design-system.md)
const C = {
  bg: "#0A0A0F",
  bgDeep: "#06060B",
  surface: "rgba(255,255,255,0.03)",
  hover: "rgba(255,255,255,0.06)",
  border: "rgba(255,255,255,0.06)",
  borderMed: "rgba(255,255,255,0.10)",
  text: "rgba(255,255,255,0.6)",
  textPrimary: "rgba(255,255,255,0.9)",
  textMuted: "rgba(255,255,255,0.3)",
  coral: "#FF6B6B",
  teal: "#4ECDC4",
  orange: "#EE5A24",
  grad: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
};

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------

function LandingScreen({ onGetStarted }) {
  return (
    <div style={styles.landing}>
      {/* Nav */}
      <nav style={styles.nav}>
        <LogoMark />
        <span style={styles.navBrand}>Xplor</span>
        <div style={{ flex: 1 }} />
        <button style={styles.navCta} onClick={onGetStarted}>
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.heroBadge}>
          <span style={styles.heroBadgeDot} />
          Structured Cognition Engine
        </div>

        <h1 style={styles.heroTitle}>
          Turn knowledge into
          <br />
          <span style={styles.heroGrad}>traversable graphs</span>
        </h1>

        <p style={styles.heroSub}>
          Upload PDFs or Markdown knowledge bases. Xplor extracts entities,
          relationships, and wikilinks — then renders them as interactive,
          AI-queryable knowledge graphs.
        </p>

        <div style={styles.heroActions}>
          <button style={styles.heroPrimary} onClick={onGetStarted}>
            Start Exploring →
          </button>
        </div>

        {/* Mode cards preview */}
        <div style={styles.modePreviewRow}>
          {[
            {
              icon: "📄",
              title: "Document Mode",
              desc: "PDFs → entity & relationship graphs via AI extraction",
              color: C.coral,
            },
            {
              icon: "🧠",
              title: "Skill Graph Mode",
              desc: "Markdown + wikilinks → traversable intelligence graphs",
              color: C.orange,
            },
          ].map((m) => (
            <div key={m.title} style={styles.modePreviewCard}>
              <span style={styles.modePreviewIcon}>{m.icon}</span>
              <div>
                <p style={{ ...styles.modePreviewTitle, color: m.color }}>{m.title}</p>
                <p style={styles.modePreviewDesc}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mode selector
// ---------------------------------------------------------------------------

function ModeSelectScreen({ onSelectMode, onBack }) {
  const [hoveredMode, setHoveredMode] = useState(null);

  const modes = [
    {
      id: MODES.DOCUMENT,
      icon: "📄",
      title: "Analyze Documents",
      subtitle: "PDF → Knowledge Graph",
      description:
        "Upload one or more PDFs. Claude extracts people, organizations, locations, dates, concepts, and the relationships between them — rendered as an interactive force-directed graph.",
      features: ["AI entity extraction", "Up to 10 PDFs at once", "Share & explore publicly"],
      color: C.coral,
      borderColor: "rgba(255,107,107,0.25)",
      bgColor: "rgba(255,107,107,0.06)",
    },
    {
      id: MODES.SKILL,
      icon: "🧠",
      title: "Explore Skill Graph",
      subtitle: "Markdown + Wikilinks → Intelligence Graph",
      description:
        "Upload a ZIP of Markdown files connected with [[wikilinks]]. Xplor parses frontmatter, extracts link context, builds a typed knowledge graph — all client-side, zero server round-trips.",
      features: ["Client-side parsing", "YAML frontmatter + wikilinks", "Quality scoring rubric"],
      color: C.orange,
      borderColor: "rgba(238,90,36,0.25)",
      bgColor: "rgba(238,90,36,0.06)",
    },
  ];

  return (
    <div style={styles.modeSelect}>
      {/* Header */}
      <div style={styles.modeSelectHeader}>
        <button style={styles.backBtn} onClick={onBack}>
          ← Back
        </button>
        <div style={{ textAlign: "center", flex: 1 }}>
          <h2 style={styles.modeSelectTitle}>Choose a Mode</h2>
          <p style={styles.modeSelectSub}>
            What kind of knowledge do you want to explore?
          </p>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Mode cards */}
      <div style={styles.modeCardGrid}>
        {modes.map((mode) => {
          const isHovered = hoveredMode === mode.id;
          return (
            <button
              key={mode.id}
              style={{
                ...styles.modeCard,
                border: `1px solid ${isHovered ? mode.borderColor : C.border}`,
                background: isHovered ? mode.bgColor : C.surface,
                transform: isHovered ? "translateY(-2px)" : "none",
                boxShadow: isHovered ? `0 8px 32px ${mode.color}18` : "none",
              }}
              onMouseEnter={() => setHoveredMode(mode.id)}
              onMouseLeave={() => setHoveredMode(null)}
              onClick={() => onSelectMode(mode.id)}
            >
              {/* Icon + badge */}
              <div style={styles.modeCardTop}>
                <div
                  style={{
                    ...styles.modeCardIconWrap,
                    background: `${mode.color}18`,
                    border: `1px solid ${mode.color}30`,
                  }}
                >
                  <span style={styles.modeCardIcon}>{mode.icon}</span>
                </div>
                <div
                  style={{
                    ...styles.modeCardBadge,
                    color: mode.color,
                    background: `${mode.color}15`,
                    border: `1px solid ${mode.color}25`,
                  }}
                >
                  {mode.subtitle}
                </div>
              </div>

              {/* Text */}
              <h3 style={{ ...styles.modeCardTitle, color: mode.color }}>
                {mode.title}
              </h3>
              <p style={styles.modeCardDesc}>{mode.description}</p>

              {/* Features */}
              <ul style={styles.modeCardFeatures}>
                {mode.features.map((f) => (
                  <li key={f} style={styles.modeCardFeature}>
                    <span style={{ color: mode.color, marginRight: 6 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div
                style={{
                  ...styles.modeCardCta,
                  background: isHovered
                    ? `linear-gradient(135deg, ${mode.color}, ${C.teal})`
                    : "transparent",
                  border: isHovered ? "none" : `1px solid ${mode.color}40`,
                  color: isHovered ? "#000" : mode.color,
                }}
              >
                {mode.id === MODES.DOCUMENT ? "Upload PDFs →" : "Upload ZIP →"}
              </div>
            </button>
          );
        })}
      </div>

      {/* Comparison hint */}
      <p style={styles.modeHint}>
        Both modes produce the same graph format — you can explore them with the
        same Explorer UI and share results publicly.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small shared components
// ---------------------------------------------------------------------------

function LogoMark() {
  return (
    <div style={styles.logo}>
      <span style={styles.logoGlyph}>◆</span>
    </div>
  );
}

function TopBar({ title, subtitle, onBack, extra }) {
  return (
    <div style={styles.topBar}>
      <button style={styles.backBtn} onClick={onBack}>
        ← Back
      </button>
      <div style={styles.topBarCenter}>
        <LogoMark />
        <div>
          <span style={styles.topBarTitle}>{title}</span>
          {subtitle && <span style={styles.topBarSub}>{subtitle}</span>}
        </div>
      </div>
      <div style={{ width: 60 }}>{extra}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root page component
// ---------------------------------------------------------------------------

export default function Page() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState(SCREENS.LANDING);
  const [selectedMode, setSelectedMode] = useState(null);
  const [graphData, setGraphData] = useState(null);

  // When auth state resolves, decide where to route
  useEffect(() => {
    if (loading) return;
    if (user && screen === SCREENS.LANDING) {
      setScreen(SCREENS.DASHBOARD);
    }
  }, [user, loading]);

  // ── Navigation helpers ──────────────────────────────────────────────────

  const goTo = (s) => setScreen(s);

  const handleGetStarted = () => {
    if (user) goTo(SCREENS.DASHBOARD);
    else goTo(SCREENS.AUTH);
  };

  const handleAuthSuccess = () => goTo(SCREENS.DASHBOARD);

  const handleNewProject = () => goTo(SCREENS.MODE_SELECT);

  const handleSelectMode = (mode) => {
    setSelectedMode(mode);
    if (mode === MODES.DOCUMENT) goTo(SCREENS.DOC_UPLOAD);
    else goTo(SCREENS.SKILL_UPLOAD);
  };

  /** Called by UploadScreen (Document Mode) when extraction is complete */
  const handleDocGraphReady = (entities, connections, name, docs) => {
    setGraphData({
      id: `doc-${Date.now()}`,
      kind: "document",
      name: name || "Document Analysis",
      nodes: entities.map((e) => ({
        ...e,
        id: e.id,
        kind: "document",
        type: e.type,
        name: e.name,
        description: e.description || "",
      })),
      edges: connections.map((c, i) => ({
        id: `edge-${i}`,
        kind: "document",
        type: "RELATED_TO",
        source: c.source,
        target: c.target,
        label: c.label,
      })),
      documents: docs || [],
    });
    goTo(SCREENS.EXPLORER);
  };

  /** Called by SkillGraphUpload when parsing is complete */
  const handleSkillGraphReady = (graph) => {
    setGraphData(graph);
    goTo(SCREENS.EXPLORER);
  };

  /** Called by ProjectsDashboard when user opens a saved project */
  const handleOpenProject = (project) => {
    setGraphData({
      id: project.id,
      kind: "document",
      name: project.name,
      nodes: (project.entities || []).map((e) => ({
        ...e,
        kind: "document",
      })),
      edges: (project.connections || []).map((c, i) => ({
        id: `edge-${i}`,
        kind: "document",
        type: "RELATED_TO",
        ...c,
      })),
      documents: project.documents || [],
    });
    goTo(SCREENS.EXPLORER);
  };

  // ── Loading splash ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={styles.splash}>
        <LogoMark />
        <div style={styles.splashBar}>
          <div style={styles.splashBarFill} />
        </div>
      </div>
    );
  }

  // ── Screen router ────────────────────────────────────────────────────────

  return (
    <div style={styles.root}>
      {/* ── Landing ── */}
      {screen === SCREENS.LANDING && (
        <LandingScreen onGetStarted={handleGetStarted} />
      )}

      {/* ── Auth ── */}
      {screen === SCREENS.AUTH && (
        <AuthScreen
          onSuccess={handleAuthSuccess}
          onBack={() => goTo(SCREENS.LANDING)}
        />
      )}

      {/* ── Dashboard ── */}
      {screen === SCREENS.DASHBOARD && (
        <div style={styles.dashWrapper}>
          <TopBar
            title="Xplor"
            subtitle="Knowledge Graph Engine"
            onBack={() => goTo(SCREENS.LANDING)}
          />
          <ProjectsDashboard
            onNewProject={handleNewProject}
            onOpenProject={handleOpenProject}
          />
        </div>
      )}

      {/* ── Mode Select ── */}
      {screen === SCREENS.MODE_SELECT && (
        <div style={styles.fullPage}>
          <ModeSelectScreen
            onSelectMode={handleSelectMode}
            onBack={() => goTo(SCREENS.DASHBOARD)}
          />
        </div>
      )}

      {/* ── Document Upload ── */}
      {screen === SCREENS.DOC_UPLOAD && (
        <div style={styles.fullPage}>
          <TopBar
            title="Document Mode"
            subtitle="PDF → Knowledge Graph"
            onBack={() => goTo(SCREENS.MODE_SELECT)}
          />
          <UploadScreen onGraphReady={handleDocGraphReady} />
        </div>
      )}

      {/* ── Skill Graph Upload ── */}
      {screen === SCREENS.SKILL_UPLOAD && (
        <div style={styles.fullPage}>
          <TopBar
            title="Skill Graph Mode"
            subtitle="Markdown → Intelligence Graph"
            onBack={() => goTo(SCREENS.MODE_SELECT)}
          />
          <SkillGraphUpload onGraphReady={handleSkillGraphReady} />
        </div>
      )}

      {/* ── Explorer ── */}
      {screen === SCREENS.EXPLORER && graphData && (
        <Explorer
          data={graphData}
          onBack={() => {
            setGraphData(null);
            goTo(selectedMode === MODES.SKILL ? SCREENS.SKILL_UPLOAD : SCREENS.DOC_UPLOAD);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  root: {
    minHeight: "100vh",
    background: C.bg,
    fontFamily: "'Outfit', system-ui, sans-serif",
    color: C.text,
  },

  // ── Splash ──
  splash: {
    minHeight: "100vh",
    background: C.bgDeep,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  splashBar: {
    width: 120,
    height: 3,
    borderRadius: 3,
    background: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  splashBarFill: {
    width: "60%",
    height: "100%",
    background: C.grad,
    borderRadius: 3,
    animation: "loading 1.5s ease-in-out infinite",
  },

  // ── Landing ──
  landing: {
    minHeight: "100vh",
    background: C.bgDeep,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "20px 32px",
    borderBottom: `1px solid ${C.border}`,
  },
  navBrand: {
    fontSize: 17,
    fontWeight: 800,
    color: "rgba(255,255,255,0.9)",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  navCta: {
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    background: C.grad,
    color: "#000",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
  },
  hero: {
    maxWidth: 680,
    margin: "0 auto",
    padding: "80px 24px 60px",
    textAlign: "center",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "5px 14px",
    borderRadius: 20,
    background: "rgba(78,205,196,0.1)",
    border: `1px solid rgba(78,205,196,0.2)`,
    fontSize: 12,
    fontWeight: 600,
    color: C.teal,
    marginBottom: 24,
  },
  heroBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: C.teal,
    display: "inline-block",
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: 800,
    lineHeight: 1.15,
    color: "rgba(255,255,255,0.95)",
    fontFamily: "'Space Grotesk', sans-serif",
    margin: "0 0 20px",
  },
  heroGrad: {
    background: C.grad,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  heroSub: {
    fontSize: 16,
    lineHeight: 1.7,
    color: "rgba(255,255,255,0.45)",
    margin: "0 0 32px",
    maxWidth: 500,
    marginLeft: "auto",
    marginRight: "auto",
  },
  heroActions: { marginBottom: 48 },
  heroPrimary: {
    padding: "14px 36px",
    borderRadius: 10,
    border: "none",
    background: C.grad,
    color: "#000",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
  },
  modePreviewRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    textAlign: "left",
  },
  modePreviewCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    padding: 20,
    borderRadius: 12,
    border: `1px solid ${C.border}`,
    background: C.surface,
  },
  modePreviewIcon: { fontSize: 24, flexShrink: 0, marginTop: 2 },
  modePreviewTitle: {
    fontSize: 13,
    fontWeight: 700,
    margin: "0 0 4px",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  modePreviewDesc: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    margin: 0,
    lineHeight: 1.5,
  },

  // ── Shared layout ──
  fullPage: {
    minHeight: "100vh",
    background: C.bg,
    display: "flex",
    flexDirection: "column",
  },
  dashWrapper: {
    minHeight: "100vh",
    background: C.bg,
    display: "flex",
    flexDirection: "column",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 24px",
    borderBottom: `1px solid ${C.border}`,
    background: "rgba(0,0,0,0.4)",
    backdropFilter: "blur(8px)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  backBtn: {
    padding: "6px 14px",
    borderRadius: 6,
    border: `1px solid ${C.borderMed}`,
    background: "transparent",
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Outfit', sans-serif",
    width: 60,
  },
  topBarCenter: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  topBarTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "rgba(255,255,255,0.8)",
    display: "block",
    fontFamily: "'Space Grotesk', sans-serif",
  },
  topBarSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
    display: "block",
  },

  // ── Logo ──
  logo: {
    width: 30,
    height: 30,
    borderRadius: 8,
    background: C.grad,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoGlyph: {
    fontSize: 13,
    fontWeight: 800,
    color: "#000",
  },

  // ── Mode Select ──
  modeSelect: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "40px 24px",
    flex: 1,
  },
  modeSelectHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: 40,
  },
  modeSelectTitle: {
    fontSize: 26,
    fontWeight: 800,
    color: "rgba(255,255,255,0.95)",
    fontFamily: "'Space Grotesk', sans-serif",
    margin: "0 0 6px",
  },
  modeSelectSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.35)",
    margin: 0,
  },
  modeCardGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 24,
  },
  modeCard: {
    padding: 28,
    borderRadius: 16,
    textAlign: "left",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    fontFamily: "'Outfit', sans-serif",
  },
  modeCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modeCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modeCardIcon: { fontSize: 22 },
  modeCardBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
    whiteSpace: "nowrap",
  },
  modeCardTitle: {
    fontSize: 20,
    fontWeight: 800,
    fontFamily: "'Space Grotesk', sans-serif",
    margin: 0,
  },
  modeCardDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.45)",
    margin: 0,
    lineHeight: 1.6,
  },
  modeCardFeatures: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  modeCardFeature: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    display: "flex",
    alignItems: "center",
  },
  modeCardCta: {
    padding: "11px 20px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.2s",
    textAlign: "center",
    marginTop: 4,
  },
  modeHint: {
    textAlign: "center",
    fontSize: 12,
    color: "rgba(255,255,255,0.25)",
    margin: 0,
  },
};
