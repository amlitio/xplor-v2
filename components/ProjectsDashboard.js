"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getProjects, deleteProject, logOut } from "@/lib/firebase";
import { useProStatus } from "@/lib/useProStatus";

export default function ProjectsDashboard({ onOpenProject, onNewProject, onGoHome, onGoSecrets }) {
  const { user } = useAuth();
  const { isPro, loading: proLoading, handleUpgrade, handleManageSubscription } = useProStatus();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadProjects();
  }, [user]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const p = await getProjects(user.uid);
      setProjects(p);
    } catch (err) {
      console.error("Failed to load projects:", err);
    }
    setLoading(false);
  };

  const handleDelete = async (projectId) => {
    try {
      await deleteProject(user.uid, projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const exampleAnalyses = [
    {
      name: "SEC Filing Analysis",
      desc: "10-K annual report showing entity relationships between executives, subsidiaries, and financial instruments",
      entities: 84, connections: 156, docs: 1,
      icon: "\ud83d\udcb0", color: "#FBBF24",
    },
    {
      name: "Research Paper Network",
      desc: "Cross-referencing 5 AI research papers to map authors, institutions, methods, and datasets",
      entities: 127, connections: 203, docs: 5,
      icon: "\ud83d\udd2c", color: "#34D399",
    },
    {
      name: "Contract Review",
      desc: "Construction contract analysis mapping parties, obligations, deadlines, and payment terms",
      entities: 52, connections: 89, docs: 3,
      icon: "\ud83d\udcdd", color: "#A78BFA",
    },
  ];

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      position: "relative", zIndex: 1,
    }}>
      {/* ═══ TOP NAV BAR ═══ */}
      <div style={{
        padding: "12px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 20,
        background: "rgba(6,6,11,0.85)", backdropFilter: "blur(16px)",
      }}>
        {/* Logo — goes to landing page */}
        <div
          onClick={onGoHome}
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#000",
          }}>{"\u25c6"}</div>
          <span style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Grotesk', sans-serif" }}>File Xplor</span>
        </div>

        {/* Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 16 }}>
          <NavBtn label="Projects" active />
          <NavBtn label="Home" onClick={onGoHome} />
          <NavBtn label="New Analysis" onClick={onNewProject} accent />
        </div>

        {/* Right side */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {/* Pro badge or upgrade */}
          {isPro ? (
            <button
              onClick={handleManageSubscription}
              style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 10,
                fontWeight: 700, letterSpacing: 0.5, border: "none",
                background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
                color: "#000", textTransform: "uppercase", cursor: "pointer",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4,
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = "0.85"}
              onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              title="Click to manage your subscription"
            >{"\u2728"} PRO</button>
          ) : !proLoading && (
            <button
              onClick={() => handleUpgrade(true)}
              style={{
                padding: "6px 14px", borderRadius: 8,
                border: "1px solid rgba(34,211,238,0.3)",
                background: "rgba(34,211,238,0.08)",
                color: "#22D3EE", fontSize: 11, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 6,
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(34,211,238,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(34,211,238,0.08)"}
            >
              {"\u2728"} Upgrade
            </button>
          )}

          {/* User dropdown */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "none", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 8, padding: "5px 12px", cursor: "pointer",
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"}
            >
              <div style={{
                width: 26, height: 26, borderRadius: "50%",
                background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 700, color: "#000",
              }}>
                {(user?.displayName || user?.email || "U")[0].toUpperCase()}
              </div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                {user?.displayName || user?.email?.split("@")[0]}
              </span>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", marginLeft: 2 }}>{"\u25bc"}</span>
            </button>

            {showMenu && (
              <>
                <div onClick={() => setShowMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 50 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "#141420", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: 6, minWidth: 210, zIndex: 51,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  {/* User info header */}
                  <div style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 4 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>
                      {user?.displayName || "User"}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                      {user?.email}
                    </div>
                    {isPro && (
                      <div style={{
                        display: "inline-block", marginTop: 6,
                        padding: "2px 8px", borderRadius: 10, fontSize: 9, fontWeight: 700,
                        background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
                        color: "#000", textTransform: "uppercase",
                      }}>Pro Member</div>
                    )}
                  </div>

                  <DropItem icon={"\ud83c\udfe0"} label="Home Page" onClick={() => { setShowMenu(false); onGoHome(); }} />
                  <DropItem icon={"\ud83d\udcca"} label="My Projects" onClick={() => setShowMenu(false)} active />
                  <DropItem icon={"\u2795"} label="New Analysis" onClick={() => { setShowMenu(false); onNewProject(); }} />
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  {isPro ? (
                    <DropItem icon={"\ud83d\udcb3"} label="Manage Subscription" onClick={() => { setShowMenu(false); handleManageSubscription(); }} />
                  ) : (
                    <DropItem icon={"\u2728"} label="Upgrade to Pro" onClick={() => { setShowMenu(false); handleUpgrade(true); }} highlight />
                  )}
                  <DropItem icon={"\ud83c\udf1f"} label="What's New" onClick={() => { setShowMenu(false); if (onGoSecrets) onGoSecrets(); }} />
                  <DropItem icon={"\ud83d\udce7"} label="Send Feedback" onClick={() => { setShowMenu(false); window.open("mailto:support@filexplor.com?subject=File Xplor Feedback"); }} />
                  <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 0" }} />
                  <DropItem icon={"\ud83d\udeaa"} label="Sign Out" onClick={() => { setShowMenu(false); logOut(); }} danger />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", maxWidth: 1000, margin: "0 auto", width: "100%" }}>
        
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", fontFamily: "'Space Grotesk', sans-serif" }}>
              Your Projects
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              {projects.length} saved analysis{projects.length !== 1 ? "es" : ""}
              {isPro && <span style={{ color: "#22D3EE", marginLeft: 8 }}>{"\u2022"} Pro</span>}
            </p>
          </div>
          <button
            onClick={onNewProject}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
              color: "#000", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}
          >
            <span style={{ fontSize: 16 }}>+</span> New Analysis
          </button>
        </div>

        {/* Upgrade banner for free users */}
        {!isPro && !proLoading && (
          <div
            onClick={() => handleUpgrade(true)}
            style={{
              padding: "16px 20px", borderRadius: 12, marginBottom: 24,
              background: "linear-gradient(135deg, rgba(34,211,238,0.06), rgba(167,139,250,0.06))",
              border: "1px solid rgba(34,211,238,0.12)",
              display: "flex", alignItems: "center", gap: 16,
              cursor: "pointer", transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(34,211,238,0.25)"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(34,211,238,0.12)"}
          >
            <span style={{ fontSize: 24 }}>{"\ud83d\ude80"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 2 }}>Unlock File Xplor Pro</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                Unlimited analyses, AI document chat, multi-doc merging, exports & more — $9.99/mo
              </div>
            </div>
            <span style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: "linear-gradient(135deg, #22D3EE, #A78BFA)", color: "#000",
            }}>Upgrade</span>
          </div>
        )}

        {/* ═══ USER'S PROJECTS ═══ */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>Loading projects...</div>
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 60,
            border: "2px dashed rgba(255,255,255,0.08)", borderRadius: 16, marginBottom: 40,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>{"\ud83d\udcc4"}</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>No projects yet</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>
              Upload PDFs to create your first interactive knowledge graph
            </div>
            <button onClick={onNewProject} style={{
              padding: "10px 24px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 13, cursor: "pointer",
            }}>Get Started</button>
          </div>
        ) : (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16, marginBottom: 40,
          }}>
            {projects.map((project) => (
              <div key={project.id} style={{
                padding: 20, borderRadius: 12,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                cursor: "pointer", transition: "all 0.2s", position: "relative",
              }}
                onClick={() => onOpenProject(project)}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
              >
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#fff", flex: 1 }}>
                    {project.name || "Untitled Analysis"}
                  </h3>
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(deleteConfirm === project.id ? null : project.id); }}
                    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>
                    {"\u00b7\u00b7\u00b7"}
                  </button>
                </div>

                {deleteConfirm === project.id && (
                  <div onClick={(e) => e.stopPropagation()} style={{
                    position: "absolute", top: 44, right: 16,
                    background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: 8, zIndex: 10,
                  }}>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      style={{
                        background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.2)",
                        borderRadius: 6, padding: "6px 14px", color: "#FF6B6B", fontSize: 11, cursor: "pointer",
                      }}>Delete Project</button>
                  </div>
                )}

                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}><span style={{ color: "#22D3EE", fontWeight: 600 }}>{project.entityCount || 0}</span> entities</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}><span style={{ color: "#A78BFA", fontWeight: 600 }}>{project.connectionCount || 0}</span> connections</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}><span style={{ color: "#34D399", fontWeight: 600 }}>{project.documentCount || 0}</span> docs</span>
                </div>

                {project.documentNames && (
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {project.documentNames.join(", ")}
                  </div>
                )}

                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {formatDate(project.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ EXAMPLE ANALYSES ═══ */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, fontFamily: "'Space Grotesk', sans-serif" }}>
              Example Analyses
            </h3>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>
              — try one to see File Xplor in action
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {exampleAnalyses.map((ex, i) => (
              <div key={i}
                onClick={onNewProject}
                style={{
                  padding: "18px 16px", borderRadius: 12,
                  background: "rgba(255,255,255,0.015)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = ex.color + "44"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.015)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>{ex.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{ex.name}</span>
                </div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", lineHeight: 1.5, margin: "0 0 10px" }}>{ex.desc}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: 12 }}>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}><span style={{ color: "#22D3EE" }}>{ex.entities}</span> entities</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}><span style={{ color: "#A78BFA" }}>{ex.connections}</span> connections</span>
                  </div>
                  <span style={{ fontSize: 10, color: ex.color, fontWeight: 600 }}>Try it {"\u2192"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ QUICK START GUIDE ═══ */}
        <div style={{
          padding: "24px", borderRadius: 14,
          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
          marginBottom: 40,
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", fontFamily: "'Space Grotesk', sans-serif" }}>
            {"\ud83d\udcd6"} Quick Start Guide
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { step: "1", title: "Upload PDFs", desc: "Click '+ New Analysis' and drag in your PDF documents" },
              { step: "2", title: "AI Extracts Entities", desc: "Our AI identifies people, organizations, locations, and concepts" },
              { step: "3", title: "Explore the Graph", desc: "Navigate the interactive network — click nodes to see details" },
              { step: "4", title: "Save & Share", desc: "Projects auto-save to your account for future reference" },
            ].map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: "#22D3EE",
                }}>{s.step}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", lineHeight: 1.45 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ FOOTER ═══ */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "16px 0", borderTop: "1px solid rgba(255,255,255,0.04)",
          flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <FooterLink label="Home" onClick={onGoHome} />
            <FooterLink label="New Analysis" onClick={onNewProject} />
            <FooterLink label="What's New" onClick={onGoSecrets} />
            {isPro
              ? <FooterLink label="Manage Plan" onClick={handleManageSubscription} />
              : <FooterLink label="Upgrade" onClick={() => handleUpgrade(true)} color="#22D3EE" />
            }
          </div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>
            {"\u00a9"} {new Date().getFullYear()} File Xplor — Powered by GS AI
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Helper Components ───

function NavBtn({ label, active, onClick, accent }) {
  return (
    <button onClick={onClick} style={{
      padding: "6px 12px", borderRadius: 6, border: "none",
      background: active ? "rgba(255,255,255,0.06)" : "transparent",
      color: accent ? "#22D3EE" : active ? "#fff" : "rgba(255,255,255,0.35)",
      fontSize: 12, fontWeight: active ? 600 : 400,
      cursor: onClick ? "pointer" : "default",
      fontFamily: "inherit", transition: "all 0.2s",
    }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >{label}</button>
  );
}

function DropItem({ icon, label, onClick, active, highlight, danger }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "8px 12px", borderRadius: 8, border: "none",
      background: active ? "rgba(255,255,255,0.06)" : "transparent",
      color: danger ? "#FF6B6B" : highlight ? "#22D3EE" : "rgba(255,255,255,0.6)",
      fontSize: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "all 0.15s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
      onMouseLeave={(e) => e.currentTarget.style.background = active ? "rgba(255,255,255,0.06)" : "transparent"}
    >
      <span style={{ fontSize: 14, width: 18, textAlign: "center" }}>{icon}</span>
      {label}
    </button>
  );
}

function FooterLink({ label, onClick, color }) {
  return (
    <span onClick={onClick} style={{
      fontSize: 11, color: color || "rgba(255,255,255,0.25)",
      cursor: "pointer", transition: "color 0.2s",
    }}
      onMouseEnter={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.5)"}
      onMouseLeave={(e) => e.currentTarget.style.color = color || "rgba(255,255,255,0.25)"}
    >{label}</span>
  );
}