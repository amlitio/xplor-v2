"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { getProjects, deleteProject, logOut } from "@/lib/firebase";

export default function ProjectsDashboard({ onOpenProject, onNewProject }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

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

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      position: "relative", zIndex: 1,
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 800, color: "#000",
        }}>◆</div>
        <span style={{
          fontSize: 15, fontWeight: 700,
          fontFamily: "'Space Grotesk', sans-serif",
        }}>File Xplor</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, #4ECDC4, #45B7D1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, color: "#000",
            }}>
              {(user?.displayName || user?.email || "U")[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
              {user?.displayName || user?.email}
            </span>
          </div>
          <button
            onClick={logOut}
            style={{
              padding: "6px 14px", borderRadius: 6,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.4)",
              fontSize: 11, cursor: "pointer",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <h2 style={{
              fontSize: 24, fontWeight: 700, margin: "0 0 4px",
              fontFamily: "'Space Grotesk', sans-serif",
            }}>Your Projects</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
              {projects.length} saved analysis{projects.length !== 1 ? "es" : ""}
            </p>
          </div>
          <button
            onClick={onNewProject}
            style={{
              padding: "10px 20px", borderRadius: 8,
              border: "none",
              background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
              color: "#000", fontSize: 13, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 16 }}>+</span> New Analysis
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.3)" }}>
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div style={{
            textAlign: "center", padding: 80,
            border: "2px dashed rgba(255,255,255,0.08)", borderRadius: 16,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
            <div style={{ fontSize: 16, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>
              No projects yet
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", marginBottom: 24 }}>
              Upload PDFs to create your first interactive knowledge graph
            </div>
            <button
              onClick={onNewProject}
              style={{
                padding: "10px 24px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff", fontSize: 13, cursor: "pointer",
              }}
            >
              Get Started
            </button>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}>
            {projects.map((project) => (
              <div
                key={project.id}
                style={{
                  padding: 20, borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  cursor: "pointer", transition: "all 0.2s",
                  position: "relative",
                }}
                onClick={() => onOpenProject(project)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                }}
              >
                <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "#fff", flex: 1 }}>
                    {project.name || "Untitled Analysis"}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(deleteConfirm === project.id ? null : project.id);
                    }}
                    style={{
                      background: "none", border: "none",
                      color: "rgba(255,255,255,0.2)", cursor: "pointer",
                      fontSize: 16, padding: "0 4px",
                    }}
                  >
                    ···
                  </button>
                </div>

                {deleteConfirm === project.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: "absolute", top: 44, right: 16,
                      background: "#1a1a24", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 8, padding: 8, zIndex: 10,
                    }}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                      style={{
                        background: "rgba(255,107,107,0.1)",
                        border: "1px solid rgba(255,107,107,0.2)",
                        borderRadius: 6, padding: "6px 14px",
                        color: "#FF6B6B", fontSize: 11, cursor: "pointer",
                      }}
                    >
                      Delete Project
                    </button>
                  </div>
                )}

                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    <span style={{ color: "#FF6B6B", fontWeight: 600 }}>{project.entityCount || 0}</span> entities
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    <span style={{ color: "#4ECDC4", fontWeight: 600 }}>{project.connectionCount || 0}</span> connections
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                    <span style={{ color: "#45B7D1", fontWeight: 600 }}>{project.documentCount || 0}</span> docs
                  </div>
                </div>

                {project.documentNames && (
                  <div style={{
                    fontSize: 11, color: "rgba(255,255,255,0.25)",
                    display: "-webkit-box", WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>
                    {project.documentNames.join(", ")}
                  </div>
                )}

                <div style={{
                  fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: 12,
                  paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)",
                }}>
                  {formatDate(project.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
