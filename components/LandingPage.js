"use client";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import PricingSection from "./PricingSection";

// ─── Animated Constellation Background ───
function ConstellationBG() {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId, nodes = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight * 4;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 90; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 2 + 0.5,
        color: ["#FF6B6B", "#4ECDC4", "#EE5A24", "#A78BFA", "#FBBF24", "#60A5FA"][Math.floor(Math.random() * 6)],
        pulse: Math.random() * Math.PI * 2,
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mx = mouse.current.x, my = mouse.current.y;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(255,255,255,${0.025 * (1 - dist / 200)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      nodes.forEach((n) => {
        n.pulse += 0.015;
        const pulseR = n.r + Math.sin(n.pulse) * 0.5;
        const dxM = n.x - mx, dyM = n.y - my;
        const distM = Math.sqrt(dxM * dxM + dyM * dyM);
        const glow = distM < 200 ? 0.6 : 0.25;

        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR + 4, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "08";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = n.color + (glow > 0.4 ? "90" : "40");
        ctx.fill();

        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
        if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
      });

      animId = requestAnimationFrame(draw);
    }
    draw();

    const handleMouse = (e) => { mouse.current = { x: e.clientX, y: e.clientY + window.scrollY }; };
    window.addEventListener("mousemove", handleMouse);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", pointerEvents: "none", opacity: 0.8 }} />;
}

// ─── Animated Counter ───
function Counter({ end, suffix = "", duration = 2000 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage({ onEnterApp }) {
  const { user } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState({});

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) setVisible((v) => ({ ...v, [e.target.id]: true }));
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const anim = (id, delay = 0) => ({
    id, "data-animate": true,
    style: {
      opacity: visible[id] ? 1 : 0,
      transform: visible[id] ? "translateY(0)" : "translateY(40px)",
      transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s`,
    }
  });

  return (
    <div style={{
      background: "#030308", color: "#E8E8ED", minHeight: "100vh",
      fontFamily: "'Sora', sans-serif", overflowX: "hidden", position: "relative",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=Newsreader:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />

      <ConstellationBG />

      {/* Noise overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* ══════ NAV ══════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 max(24px, 4vw)", height: 64, display: "flex", alignItems: "center",
        background: scrollY > 60 ? "rgba(3,3,8,0.8)" : "transparent",
        backdropFilter: scrollY > 60 ? "blur(24px) saturate(1.5)" : "none",
        borderBottom: scrollY > 60 ? "1px solid rgba(255,255,255,0.04)" : "none",
        transition: "all 0.5s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#000",
          }}>{"\u25c6"}</div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>Xplor</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#modes" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }} className="nav-link-desktop">Modes</a>
          <a href="#features" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }} className="nav-link-desktop">Features</a>
          <a href="#use-cases" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none" }} className="nav-link-desktop">Use Cases</a>
          <button onClick={onEnterApp} style={{
            padding: "8px 20px", borderRadius: 8,
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            border: "none", color: "#000", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 0 20px rgba(255,107,107,0.15)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(255,107,107,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(255,107,107,0.15)"; }}>
            {user ? "Open App \u2192" : "Try Free \u2192"}
          </button>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "100px max(24px, 4vw) 60px",
        position: "relative", zIndex: 2, textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px 6px 8px", borderRadius: 24,
          background: "rgba(255,107,107,0.06)", border: "1px solid rgba(255,107,107,0.15)",
          marginBottom: 32, animation: "fadeUp 0.8s ease both",
        }}>
          <span style={{
            padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)", color: "#000",
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>New</span>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Structured cognition engine for AI</span>
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 6.5vw, 72px)", fontWeight: 800,
          lineHeight: 1.08, margin: "0 0 20px", maxWidth: 900,
          letterSpacing: "-0.035em",
          animation: "fadeUp 0.8s ease 0.1s both",
        }}>
          Turn knowledge into
          <br />
          <span style={{
            background: "linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 40%, #EE5A24 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>traversable graphs</span>
        </h1>

        <p style={{
          fontSize: "clamp(15px, 1.8vw, 19px)",
          color: "rgba(255,255,255,0.45)", maxWidth: 620,
          lineHeight: 1.65, margin: "0 auto 36px",
          fontFamily: "'Newsreader', serif", fontStyle: "italic",
          animation: "fadeUp 0.8s ease 0.2s both",
        }}>
          Documents. Codebases. Knowledge systems. Xplor transforms them all into interactive, AI-queryable knowledge graphs {"\u2014"} so agents don't just follow instructions, they understand domains.
        </p>

        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.8s ease 0.3s both",
        }}>
          <button onClick={onEnterApp} style={{
            padding: "14px 32px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.3s",
            boxShadow: "0 4px 30px rgba(255,107,107,0.2), 0 0 80px rgba(78,205,196,0.08)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; }}>
            Start Exploring {"\u2014"} Free
          </button>
          <a href="#modes" style={{
            padding: "14px 28px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 500,
            cursor: "pointer", textDecoration: "none", fontFamily: "inherit",
          }}>
            See all 3 modes
          </a>
        </div>

        {/* Three mode pills */}
        <div style={{
          marginTop: 48, display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.8s ease 0.5s both",
        }}>
          {[
            { icon: "\ud83d\udcc4", label: "Documents", color: "#FF6B6B" },
            { icon: "\ud83d\udcbb", label: "Codebases", color: "#4ECDC4" },
            { icon: "\ud83e\udde0", label: "Knowledge Systems", color: "#EE5A24" },
          ].map((m, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 20,
              background: m.color + "0A", border: `1px solid ${m.color}20`,
            }}>
              <span style={{ fontSize: 16 }}>{m.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ STATS ══════ */}
      <section style={{
        padding: "48px max(24px, 4vw)", position: "relative", zIndex: 2,
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}>
        <div {...anim("stats")} style={{
          ...anim("stats").style,
          maxWidth: 900, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 32,
          textAlign: "center",
        }}>
          {[
            { val: <Counter end={50} suffix="K+" />, label: "Documents Analyzed" },
            { val: <Counter end={2} suffix="M+" />, label: "Entities Extracted" },
            { val: "3", label: "Ingestion Modes" },
            { val: "5", label: "Progressive Disclosure Levels" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ THREE MODES ══════ */}
      <section id="modes" style={{ padding: "100px max(24px, 4vw)", position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div {...anim("modes-title")} style={{ ...anim("modes-title").style, textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#4ECDC4", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>Three Modes, One Engine</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: -1, lineHeight: 1.12 }}>
              Every knowledge type.<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>One unified graph.</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6, fontFamily: "'Newsreader', serif" }}>
              All three modes produce the same canonical graph format. Explore with the same UI. Query with the same AI. Even fuse them together.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              {
                icon: "\ud83d\udcc4", title: "Document Mode", subtitle: "PDF \u2192 Knowledge Graph",
                color: "#FF6B6B",
                desc: "Upload PDFs \u2014 contracts, research papers, financial reports. Claude AI reads every page, extracts entities (people, organizations, locations, dates, concepts) and their relationships.",
                features: ["AI entity extraction via Claude", "Multi-document cross-referencing", "Interactive force-directed graph", "AI chat \u2014 ask questions about your docs"],
                status: "Live",
              },
              {
                icon: "\ud83e\udde0", title: "Skill Graph Mode", subtitle: "Markdown \u2192 Intelligence Graph",
                color: "#EE5A24",
                desc: "Upload a ZIP of interconnected Markdown files with [[wikilinks]] and YAML frontmatter. Parses everything client-side, builds typed knowledge graphs with quality scoring.",
                features: ["[[Wikilink]] sentence-level context", "YAML frontmatter extraction", "Quality scoring (broken links, orphans)", "Maps of Content cluster detection"],
                status: "Live",
              },
              {
                icon: "\ud83d\udcbb", title: "Code Mode", subtitle: "Repos \u2192 Dependency Graph",
                color: "#4ECDC4",
                desc: "Point at a Git repo or ZIP. Tree-sitter parses ASTs, extracting functions, classes, imports, and call chains. Understand how auth works by traversing CALLS edges outward.",
                features: ["AST parsing via Tree-sitter", "Functions, classes, imports, call chains", "CALLS / IMPORTS / DEFINES edges", "Cross-file dependency mapping"],
                status: "Coming Soon",
              },
            ].map((mode, i) => (
              <div key={i} {...anim(`mode-${i}`, i * 0.1)} style={{
                ...anim(`mode-${i}`, i * 0.1).style,
                padding: "32px 24px", borderRadius: 20,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                position: "relative", overflow: "hidden",
                display: "flex", flexDirection: "column",
              }}>
                <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: `radial-gradient(circle, ${mode.color}08, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontSize: 32 }}>{mode.icon}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 10,
                    background: mode.status === "Live" ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.06)",
                    color: mode.status === "Live" ? "#4ECDC4" : "rgba(255,255,255,0.3)",
                    textTransform: "uppercase", letterSpacing: 1,
                  }}>{mode.status}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: mode.color, margin: "0 0 4px" }}>{mode.title}</h3>
                <p style={{ fontSize: 11, fontWeight: 600, color: mode.color + "80", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 14px" }}>{mode.subtitle}</p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 0 18px", flex: 1 }}>{mode.desc}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {mode.features.map((f, j) => (
                    <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                      <span style={{ color: mode.color, flexShrink: 0 }}>{"\u2713"}</span>{f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ WHAT XPLOR DOES — COMPREHENSIVE FEATURES ══════ */}
      <section id="features" style={{
        padding: "80px max(24px, 4vw) 100px", position: "relative", zIndex: 2,
        background: "linear-gradient(180deg, transparent, rgba(255,107,107,0.015), transparent)",
      }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div {...anim("features-title")} style={{ ...anim("features-title").style, textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#FF6B6B", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>The Full Platform</div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: -1, lineHeight: 1.12 }}>
              Everything you need to<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>build intelligence layers</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
            {[
              { icon: "\ud83e\udde0", title: "AI Entity Extraction", desc: "Claude reads every page of your documents, identifying people, organizations, locations, dates, money amounts, concepts, and events \u2014 then maps relationships between them.", color: "#FF6B6B" },
              { icon: "\ud83d\udd78\ufe0f", title: "Interactive Knowledge Graphs", desc: "Force-directed graph visualization. Click nodes, trace connections, filter by type, zoom, pan. Every entity tells a story through its relationships.", color: "#4ECDC4" },
              { icon: "\ud83d\udcac", title: "AI Chat", desc: "Ask natural language questions about your uploaded documents and knowledge bases. Get answers with citations pointing to specific entities and connections in the graph.", color: "#A78BFA" },
              { icon: "\ud83d\udd17", title: "Wikilink Intelligence", desc: "[[Wikilinks]] parsed with sentence-level context extraction. Not just 'A links to B' but exactly why, with the surrounding sentence preserved for AI reasoning.", color: "#EE5A24" },
              { icon: "\ud83d\udcca", title: "Quality Scoring", desc: "Every knowledge graph gets a health score: broken links (-10), missing descriptions (-5), orphan nodes (-3). Plus bonuses for MOC coverage and link density.", color: "#FBBF24" },
              { icon: "\ud83c\udfaf", title: "Progressive Disclosure", desc: "5 levels of detail: Index \u2192 Scan \u2192 Links \u2192 Sections \u2192 Full. AI agents load only what they need instead of dumping everything into context.", color: "#34D399" },
              { icon: "\ud83d\uddc2\ufe0f", title: "Maps of Content", desc: "MOC nodes act as navigation hubs for knowledge clusters. Automatically detected via CLUSTERS edges. Navigate complex knowledge bases hierarchically.", color: "#F472B6" },
              { icon: "\ud83d\udd0d", title: "Hybrid Search", desc: "BM25 full-text search + semantic similarity + graph degree boosting with Reciprocal Rank Fusion. Find anything across your entire knowledge layer.", color: "#60A5FA" },
              { icon: "\ud83d\ude80", title: "MCP Server", desc: "Expose your knowledge graphs to any AI agent via Model Context Protocol. Tools: query, context, impact, traverse, search. Works with Claude Code & Cursor.", color: "#4ECDC4" },
              { icon: "\u2318", title: "CLI Tools", desc: "xplor index, xplor mcp, xplor serve, xplor skill \u2014 index repos and knowledge bases from the terminal. Ship as an npm package.", color: "#A78BFA" },
              { icon: "\ud83e\uddf0", title: "Multi-Domain Fusion", desc: "Merge a codebase graph with company docs and domain skill graphs into one queryable layer. CROSS_DOMAIN edges link related concepts automatically.", color: "#FF6B6B" },
              { icon: "\ud83d\udd12", title: "Save, Share & Collaborate", desc: "Every analysis auto-saves to your account. Generate public share links. Build an ever-growing organizational knowledge base.", color: "#EE5A24" },
            ].map((f, i) => (
              <div key={i} {...anim(`feat-${i}`, i * 0.05)} style={{
                ...anim(`feat-${i}`, i * 0.05).style,
                padding: "22px 20px", borderRadius: 12,
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.04)",
                transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.05}s`,
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = f.color + "33"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 20 }}>{f.icon}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: f.color }}>{f.title}</h3>
                </div>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.38)", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ THE VISION ══════ */}
      <section style={{
        padding: "80px max(24px, 4vw)", position: "relative", zIndex: 2,
      }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div {...anim("vision")}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#EE5A24", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>The Philosophy</div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: "0 0 24px", letterSpacing: -0.5, lineHeight: 1.15 }}>
              Not descriptions.<br />
              <span style={{ background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Relationships.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto 16px", lineHeight: 1.65, fontFamily: "'Newsreader', serif" }}>
              Traditional tools give you summaries. Xplor gives you call chains, dependency graphs, semantic connections, and attention-scored traversal paths.
            </p>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto 16px", lineHeight: 1.65, fontFamily: "'Newsreader', serif" }}>
              When an AI agent asks "What uses this function?" it gets execution flows. When it asks "How does this therapy technique connect to attachment theory?" it traverses the skill graph and pulls exactly what the situation requires.
            </p>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.55)", maxWidth: 560, margin: "0 auto", lineHeight: 1.65, fontFamily: "'Newsreader', serif", fontStyle: "italic" }}>
              This is the difference between an agent that follows instructions and an agent that understands a domain.
            </p>
          </div>
        </div>
      </section>

      {/* ══════ USE CASES ══════ */}
      <section id="use-cases" style={{ padding: "80px max(24px, 4vw) 100px", position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div {...anim("cases-title")} style={{ ...anim("cases-title").style, textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#F472B6", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>Use Cases</div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.15 }}>
              Built for people who<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>work with complex knowledge</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {[
              { icon: "\u2696\ufe0f", title: "Legal Teams", desc: "Map relationships across contracts, depositions, and case files. Find connections opposing counsel missed.", color: "#A78BFA" },
              { icon: "\ud83d\udd2c", title: "Researchers", desc: "Synthesize hundreds of papers into a single knowledge graph. Discover cross-disciplinary insights instantly.", color: "#34D399" },
              { icon: "\ud83d\udcca", title: "Business Analysts", desc: "Turn financial reports, board minutes, and strategy docs into actionable relationship maps.", color: "#22D3EE" },
              { icon: "\ud83c\udfd7\ufe0f", title: "Construction & Engineering", desc: "Extract specs, subcontractors, and compliance requirements across project documents.", color: "#FBBF24" },
              { icon: "\ud83e\udde9", title: "Knowledge Managers", desc: "Turn Obsidian vaults, wikis, and markdown notes into navigable intelligence graphs with quality scoring and MOC detection.", color: "#EE5A24" },
              { icon: "\ud83e\udd16", title: "AI Engineers", desc: "Build traversable knowledge layers for AI agents. Progressive disclosure ensures agents load only what they need. Expose via MCP.", color: "#4ECDC4" },
              { icon: "\ud83d\udcf0", title: "Journalists", desc: "Connect the dots between public records, financial disclosures, and leaked documents.", color: "#F472B6" },
              { icon: "\ud83c\udf93", title: "Students & Academics", desc: "Build literature reviews and thesis maps. See how theories connect across papers and disciplines.", color: "#60A5FA" },
            ].map((uc, i) => (
              <div key={i} {...anim(`uc-${i}`, i * 0.06)} style={{
                ...anim(`uc-${i}`, i * 0.06).style,
                padding: "22px 20px", borderRadius: 12,
                background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
                transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s`,
              }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = uc.color + "33"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>{uc.icon}</span>
                  <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: uc.color }}>{uc.title}</h3>
                </div>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.38)", lineHeight: 1.55, margin: 0 }}>{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ TESTIMONIAL ══════ */}
      <section style={{ padding: "60px max(24px, 4vw) 80px", position: "relative", zIndex: 2 }}>
        <div {...anim("testimonial")} style={{ ...anim("testimonial").style, maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.06)", marginBottom: 16 }}>{'"'}</div>
          <p style={{
            fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.55)",
            lineHeight: 1.7, margin: "0 0 24px",
            fontFamily: "'Newsreader', serif", fontStyle: "italic",
          }}>
            We uploaded 47 construction contracts and Xplor mapped every subcontractor relationship in minutes. It would have taken our team weeks.
          </p>
          <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>{"\u2014"} Project Manager, Infrastructure Firm</div>
        </div>
      </section>

      {/* ══════ PRICING ══════ */}
      <PricingSection onEnterApp={onEnterApp} anim={anim} />

      {/* ══════ FINAL CTA ══════ */}
      <section style={{ padding: "60px max(24px, 4vw) 100px", position: "relative", zIndex: 2 }}>
        <div {...anim("cta")} style={{
          ...anim("cta").style,
          maxWidth: 640, margin: "0 auto", textAlign: "center",
          padding: "clamp(40px, 6vw, 72px) clamp(24px, 4vw, 48px)",
          borderRadius: 24,
          background: "linear-gradient(135deg, rgba(255,107,107,0.05), rgba(78,205,196,0.05))",
          border: "1px solid rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, background: "radial-gradient(circle, rgba(255,107,107,0.08), transparent 70%)", pointerEvents: "none" }} />
          <h2 style={{ fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.15, position: "relative" }}>
            Ready to build your<br />intelligence layer?
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 28px", fontFamily: "'Newsreader', serif", fontStyle: "italic", position: "relative" }}>
            Upload a PDF, a ZIP of markdown files, or point at a repo. Start in 10 seconds.
          </p>
          <button onClick={onEnterApp} style={{
            padding: "14px 36px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.3s", position: "relative",
            boxShadow: "0 4px 30px rgba(255,107,107,0.2)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}>
            Get Started Free {"\u2192"}
          </button>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer style={{
        padding: "24px max(24px, 4vw)",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12, position: "relative", zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, color: "#000",
          }}>{"\u25c6"}</div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            {"\u00a9"} {new Date().getFullYear()} Xplor
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            onClick={() => window.__showSecrets?.()}
            style={{ fontSize: 10, color: "rgba(255,255,255,0.06)", cursor: "default", transition: "color 0.5s", letterSpacing: 1, userSelect: "none" }}
            onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.25)"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.06)"}
          >
            Secrets
          </span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>
            Powered by GS AI
          </span>
        </div>
      </footer>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (min-width: 768px) {
          .nav-link-desktop { display: inline-block !important; }
        }
        @media (max-width: 768px) {
          .nav-link-desktop { display: none !important; }
        }
        * { box-sizing: border-box; }
        a:hover { color: rgba(255,255,255,0.7) !important; }
      `}</style>
    </div>
  );
}
