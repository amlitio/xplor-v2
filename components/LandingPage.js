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
      canvas.height = window.innerHeight * 3;
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 80; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 2 + 0.5,
        color: ["#22D3EE", "#A78BFA", "#34D399", "#F472B6", "#FBBF24", "#60A5FA"][Math.floor(Math.random() * 6)],
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

        n.x += n.vx;
        n.y += n.vy;
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

  const useCases = [
    { icon: "\u2696\ufe0f", title: "Legal Teams", desc: "Map relationships across contracts, depositions, and case files. Find connections opposing counsel missed.", color: "#A78BFA" },
    { icon: "\ud83d\udd2c", title: "Researchers", desc: "Synthesize hundreds of papers into a single knowledge graph. Discover cross-disciplinary insights instantly.", color: "#34D399" },
    { icon: "\ud83d\udcca", title: "Business Analysts", desc: "Turn financial reports, board minutes, and strategy docs into actionable relationship maps.", color: "#22D3EE" },
    { icon: "\ud83c\udfd7\ufe0f", title: "Construction & Engineering", desc: "Extract specs, subcontractors, and compliance requirements across project documents.", color: "#FBBF24" },
    { icon: "\ud83d\udcf0", title: "Journalists", desc: "Connect the dots between public records, financial disclosures, and leaked documents.", color: "#F472B6" },
    { icon: "\ud83c\udf93", title: "Students & Academics", desc: "Build comprehensive literature reviews and thesis maps from your entire reading list.", color: "#60A5FA" },
    { icon: "\ud83e\udde9", title: "Knowledge Managers", desc: "Turn Obsidian vaults, wikis, and markdown notes into navigable intelligence graphs with quality scoring.", color: "#EE5A24" },
    { icon: "\ud83e\udd16", title: "AI Builders", desc: "Build traversable knowledge layers for AI agents. Progressive disclosure ensures agents load only what they need.", color: "#34D399" },
  ];

  const steps = [
    { num: "01", title: "Upload Any PDF", desc: "Drag and drop reports, contracts, research papers \u2014 any document. No size limits, no formatting requirements.", icon: "\ud83d\udce4" },
    { num: "02", title: "AI Maps Everything", desc: "Our AI reads every page, identifying people, organizations, locations, concepts, and the hidden threads connecting them.", icon: "\ud83e\udde0" },
    { num: "03", title: "Explore & Discover", desc: "Navigate an interactive force-directed graph. Click nodes, trace connections, filter by type. Find what you didn't know to look for.", icon: "\ud83d\udd78\ufe0f" },
    { num: "04", title: "Save & Share", desc: "Keep every analysis in your account. Generate share links for your team. Build an ever-growing knowledge base.", icon: "\ud83d\udd17" },
  ];

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

      {/* ══════ NOISE OVERLAY ══════ */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1, opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
      }} />

      {/* ══════ NAV ══════ */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 max(24px, 4vw)",
        height: 64, display: "flex", alignItems: "center",
        background: scrollY > 60 ? "rgba(3,3,8,0.8)" : "transparent",
        backdropFilter: scrollY > 60 ? "blur(24px) saturate(1.5)" : "none",
        borderBottom: scrollY > 60 ? "1px solid rgba(255,255,255,0.04)" : "none",
        transition: "all 0.5s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#000",
          }}>{"\u25c6"}</div>
          <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>File Xplor</span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 24 }}>
          <a href="#how" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", display: "none" }} className="nav-link-desktop">How it works</a>
          <a href="#use-cases" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", display: "none" }} className="nav-link-desktop">Use cases</a>
          <a href="#pricing" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", textDecoration: "none", display: "none" }} className="nav-link-desktop">Pricing</a>
          <button onClick={onEnterApp} style={{
            padding: "8px 20px", borderRadius: 8,
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            border: "none", color: "#000", fontSize: 13, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit",
            transition: "transform 0.2s, box-shadow 0.2s",
            boxShadow: "0 0 20px rgba(34,211,238,0.15)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(34,211,238,0.25)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(34,211,238,0.15)"; }}>
            {user ? "Open App \u2192" : "Try Free \u2192"}
          </button>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <section style={{
        minHeight: "100vh", minHeight: "100dvh",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "100px max(24px, 4vw) 60px",
        position: "relative", zIndex: 2, textAlign: "center",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 14px 6px 8px", borderRadius: 24,
          background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)",
          marginBottom: 32, animation: "fadeUp 0.8s ease both",
        }}>
          <span style={{
            padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700,
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)", color: "#000",
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>New</span>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>AI-powered document & knowledge intelligence</span>
        </div>

        <h1 style={{
          fontSize: "clamp(32px, 6.5vw, 72px)", fontWeight: 800,
          lineHeight: 1.08, margin: "0 0 20px", maxWidth: 800,
          letterSpacing: "-0.035em",
          animation: "fadeUp 0.8s ease 0.1s both",
        }}>
          Your documents are
          <br />
          <span style={{
            background: "linear-gradient(135deg, #22D3EE 0%, #A78BFA 40%, #F472B6 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>full of secrets</span>
        </h1>

        <p style={{
          fontSize: "clamp(15px, 1.8vw, 19px)",
          color: "rgba(255,255,255,0.45)", maxWidth: 520,
          lineHeight: 1.65, margin: "0 auto 36px",
          fontFamily: "'Newsreader', serif", fontStyle: "italic",
          animation: "fadeUp 0.8s ease 0.2s both",
        }}>
          Upload any PDF. AI extracts every person, place, organization, and concept {"\u2014"} then reveals the hidden connections between them. Or upload markdown knowledge bases and explore them as interactive intelligence graphs.
        </p>

        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.8s ease 0.3s both",
        }}>
          <button onClick={onEnterApp} style={{
            padding: "14px 32px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.3s",
            boxShadow: "0 4px 30px rgba(34,211,238,0.2), 0 0 80px rgba(167,139,250,0.08)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px) scale(1.02)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(34,211,238,0.3), 0 0 100px rgba(167,139,250,0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 4px 30px rgba(34,211,238,0.2), 0 0 80px rgba(167,139,250,0.08)"; }}>
            Start Exploring {"\u2014"} Free
          </button>
          <a href="#how" style={{
            padding: "14px 28px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.1)",
            background: "rgba(255,255,255,0.03)",
            color: "rgba(255,255,255,0.6)", fontSize: 15, fontWeight: 500,
            cursor: "pointer", textDecoration: "none", fontFamily: "inherit",
            transition: "all 0.3s", display: "inline-flex", alignItems: "center",
          }}>
            See how it works
          </a>
        </div>

        <div style={{
          marginTop: 48, display: "flex", alignItems: "center", gap: 16,
          flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.8s ease 0.5s both",
        }}>
          <div style={{ display: "flex" }}>
            {["#A78BFA", "#22D3EE", "#34D399", "#FBBF24"].map((c, i) => (
              <div key={i} style={{
                width: 28, height: 28, borderRadius: "50%",
                background: `linear-gradient(135deg, ${c}, ${c}88)`,
                border: "2px solid #030308", marginLeft: i > 0 ? -8 : 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color: "#000",
              }}>{["R", "S", "M", "K"][i]}</div>
            ))}
          </div>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
            Trusted by researchers, analysts & legal teams
          </span>
        </div>

        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          animation: "fadeUp 0.8s ease 0.7s both",
        }}>
          <div style={{
            width: 24, height: 38, borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.12)",
            display: "flex", justifyContent: "center", paddingTop: 8,
          }}>
            <div style={{
              width: 3, height: 8, borderRadius: 2,
              background: "rgba(255,255,255,0.3)",
              animation: "scrollDot 2s ease-in-out infinite",
            }} />
          </div>
        </div>
      </section>

      {/* ══════ STATS BAR ══════ */}
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
            { val: <Counter end={10} suffix="x" />, label: "Faster Than Manual" },
            { val: "99.2%", label: "Extraction Accuracy" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: "clamp(24px, 3.5vw, 36px)", fontWeight: 800, color: "#fff", letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ TWO POWERFUL MODES ══════ */}
      <section style={{ padding: "100px max(24px, 4vw)", position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div {...anim("modes-title")} style={{ ...anim("modes-title").style, textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#34D399", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
              Two Powerful Modes
            </div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: -1, lineHeight: 1.12 }}>
              One engine. Two ways to<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>transform knowledge</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto", lineHeight: 1.6, fontFamily: "'Newsreader', serif" }}>
              Whether you work with PDFs or structured markdown, Xplor turns your content into interactive, queryable knowledge graphs.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900, margin: "0 auto" }}>
            {/* Document Mode */}
            <div {...anim("mode-doc", 0)} style={{
              ...anim("mode-doc", 0).style,
              padding: "32px 28px", borderRadius: 20,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(circle, rgba(34,211,238,0.06), transparent 70%)", pointerEvents: "none" }} />
              <span style={{ fontSize: 36, display: "block", marginBottom: 16 }}>{"\ud83d\udcc4"}</span>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#22D3EE", margin: "0 0 8px" }}>Document Mode</h3>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(34,211,238,0.6)", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 16px" }}>PDF → Knowledge Graph</p>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: "0 0 20px" }}>
                Upload PDFs — contracts, research papers, financial reports, legal filings. Claude AI reads every page, extracts entities and relationships, and builds an interactive graph you can explore, search, and share.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["AI entity extraction (people, orgs, locations, dates, concepts)", "Multi-document cross-referencing", "Interactive force-directed graph visualization", "AI chat — ask questions about your documents", "Save, share, and collaborate"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ color: "#22D3EE", flexShrink: 0, marginTop: 1 }}>{"\u2713"}</span>{f}
                  </div>
                ))}
              </div>
            </div>

            {/* Skill Graph Mode */}
            <div {...anim("mode-skill", 0.12)} style={{
              ...anim("mode-skill", 0.12).style,
              padding: "32px 28px", borderRadius: 20,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, background: "radial-gradient(circle, rgba(238,90,36,0.06), transparent 70%)", pointerEvents: "none" }} />
              <span style={{ fontSize: 36, display: "block", marginBottom: 16 }}>{"\ud83e\udde0"}</span>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#EE5A24", margin: "0 0 8px" }}>Skill Graph Mode</h3>
              <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(238,90,36,0.6)", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 16px" }}>Markdown → Intelligence Graph</p>
              <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, margin: "0 0 20px" }}>
                Upload a ZIP of interconnected Markdown files with [[wikilinks]] and YAML frontmatter. Xplor parses everything client-side, builds a typed knowledge graph, and scores the quality of your knowledge base.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["[[Wikilink]] parsing with sentence-level context", "YAML frontmatter extraction (type, domain, tags)", "Quality scoring — broken links, orphans, coverage", "Maps of Content (MOC) cluster detection", "Zero server round-trips — 100% client-side"].map((f, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                    <span style={{ color: "#EE5A24", flexShrink: 0, marginTop: 1 }}>{"\u2713"}</span>{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════ HOW IT WORKS ══════ */}
      <section id="how" style={{ padding: "100px max(24px, 4vw)", position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div {...anim("how-title")}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#22D3EE", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
              How It Works
            </div>
            <h2 style={{ fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, margin: "0 0 16px", letterSpacing: -1, lineHeight: 1.12 }}>
              From PDF to insight<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>in under 60 seconds</span>
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", maxWidth: 480, lineHeight: 1.6, margin: "0 0 56px", fontFamily: "'Newsreader', serif" }}>
              No training. No setup. Upload a document and watch the connections appear.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {steps.map((step, i) => (
              <div key={i} {...anim(`step-${i}`, i * 0.1)} style={{
                ...anim(`step-${i}`, i * 0.1).style,
                padding: "28px 24px", borderRadius: 16,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                position: "relative", overflow: "hidden",
                transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.1}s`,
              }}>
                <div style={{ fontSize: 28, marginBottom: 16 }}>{step.icon}</div>
                <div style={{
                  fontWeight: 700, color: "rgba(255,255,255,0.12)",
                  position: "absolute", top: 20, right: 20, letterSpacing: -0.5,
                  fontSize: 32,
                }}>{step.num}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px", color: "#fff" }}>{step.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.55, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ VALUE PROPOSITION ══════ */}
      <section style={{
        padding: "80px max(24px, 4vw)", position: "relative", zIndex: 2,
        background: "linear-gradient(180deg, transparent, rgba(34,211,238,0.02), transparent)",
      }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <div {...anim("value")}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#A78BFA", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
              Why File Xplor
            </div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: "0 0 20px", letterSpacing: -0.5, lineHeight: 1.15 }}>
              Stop reading. Start <span style={{ color: "#22D3EE" }}>seeing.</span>
            </h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.4)", maxWidth: 560, margin: "0 auto 48px", lineHeight: 1.65, fontFamily: "'Newsreader', serif" }}>
              A 200-page document has thousands of data points. Your brain can hold about seven in working memory. Let AI handle the rest.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, textAlign: "left" }}>
            {[
              { title: "See What Others Miss", desc: "AI identifies relationships between entities that span hundreds of pages apart \u2014 connections impossible to spot manually.", color: "#22D3EE" },
              { title: "Multi-Document Intelligence", desc: "Upload 10 reports. Watch entities merge across documents, revealing cross-file patterns no human could track.", color: "#A78BFA" },
              { title: "Interactive Exploration", desc: "Not a static chart. A living, breathing network you can zoom, filter, click, and search. Every node tells a story.", color: "#34D399" },
            ].map((f, i) => (
              <div key={i} {...anim(`val-${i}`, i * 0.12)} style={{
                ...anim(`val-${i}`, i * 0.12).style,
                padding: 24, borderRadius: 14,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ width: 4, height: 24, borderRadius: 2, background: f.color, marginBottom: 16, opacity: 0.7 }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 8px" }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.55, margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ USE CASES ══════ */}
      <section id="use-cases" style={{ padding: "80px max(24px, 4vw) 100px", position: "relative", zIndex: 2 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div {...anim("cases-title")} style={{ ...anim("cases-title").style, textAlign: "center", marginBottom: 56 }}>
            <div style={{ fontSize: 11, letterSpacing: 4, color: "#F472B6", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>
              Use Cases
            </div>
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 38px)", fontWeight: 800, margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.15 }}>
              Built for people who<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>drown in documents</span>
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {useCases.map((uc, i) => (
              <div key={i} {...anim(`uc-${i}`, i * 0.08)} style={{
                ...anim(`uc-${i}`, i * 0.08).style,
                padding: "22px 20px", borderRadius: 12,
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.04)",
                cursor: "default",
                transition: `all 0.9s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.08}s`,
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
        <div {...anim("testimonial")} style={{
          ...anim("testimonial").style,
          maxWidth: 600, margin: "0 auto", textAlign: "center",
        }}>
          <div style={{ fontSize: 40, color: "rgba(255,255,255,0.06)", marginBottom: 16 }}>{'"'}</div>
          <p style={{
            fontSize: "clamp(16px, 2vw, 20px)", color: "rgba(255,255,255,0.55)",
            lineHeight: 1.7, margin: "0 0 24px",
            fontFamily: "'Newsreader', serif", fontStyle: "italic",
          }}>
            We uploaded 47 construction contracts and File Xplor mapped every subcontractor relationship in minutes. It would have taken our team weeks.
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
          background: "linear-gradient(135deg, rgba(34,211,238,0.05), rgba(167,139,250,0.05))",
          border: "1px solid rgba(255,255,255,0.05)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: -60, right: -60, width: 200, height: 200,
            background: "radial-gradient(circle, rgba(34,211,238,0.08), transparent 70%)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute", bottom: -40, left: -40, width: 160, height: 160,
            background: "radial-gradient(circle, rgba(167,139,250,0.06), transparent 70%)",
            pointerEvents: "none",
          }} />

          <h2 style={{
            fontSize: "clamp(22px, 3.5vw, 34px)", fontWeight: 800,
            margin: "0 0 12px", letterSpacing: -0.5, lineHeight: 1.15,
            position: "relative",
          }}>
            Ready to see what{"\u2019"}s hiding<br />in your documents?
          </h2>
          <p style={{
            fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "0 0 28px",
            fontFamily: "'Newsreader', serif", fontStyle: "italic", position: "relative",
          }}>
            No credit card. No setup. Upload your first PDF in 10 seconds.
          </p>
          <button onClick={onEnterApp} style={{
            padding: "14px 36px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            color: "#000", fontSize: 15, fontWeight: 700, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.3s", position: "relative",
            boxShadow: "0 4px 30px rgba(34,211,238,0.2)",
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 40px rgba(34,211,238,0.3)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 30px rgba(34,211,238,0.2)"; }}>
            Get Started Free {"\u2192"}
          </button>
        </div>
      </section>

      {/* ══════ FOOTER ══════ */}
      <footer style={{
        padding: "24px max(24px, 4vw)",
        borderTop: "1px solid rgba(255,255,255,0.03)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
        position: "relative", zIndex: 2,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 20, height: 20, borderRadius: 5,
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 9, fontWeight: 800, color: "#000",
          }}>{"\u25c6"}</div>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            {"\u00a9"} {new Date().getFullYear()} File Xplor
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span
            onClick={() => window.__showSecrets?.()}
            style={{
              fontSize: 10, color: "rgba(255,255,255,0.06)", cursor: "default",
              transition: "color 0.5s", letterSpacing: 1, userSelect: "none",
            }}
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
        @keyframes scrollDot {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(8px); opacity: 0.8; }
        }
        @media (min-width: 768px) {
          .nav-link-desktop { display: inline-block !important; }
        }
        * { box-sizing: border-box; }
        a:hover { color: rgba(255,255,255,0.7) !important; }
      `}</style>
    </div>
  );
}