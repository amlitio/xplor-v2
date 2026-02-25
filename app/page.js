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
  // auto | auth | landing | secrets | projects | mode_select | upload | skill_upload | github_upload | explorer
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

  // Secrets page
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

  // Document Mode upload
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

  // Skill Graph upload
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
            <button onClick={() => setScreen("mode_select")} style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer",
            }}>← Back</button>
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
              // Bridge: skill graph {nodes, edges} → Explorer {entities, connections}
              const entities = (graph.nodes || []).map((n) => ({
                id: n.id,
                name: n.name,
                type: n.type || "skill",
                description: n.description || "",
                sources: n.source?.filePath ? [n.source.filePath] : [],
              }));
              const connections = (graph.edges || []).map((e) => ({
                source: e.source,
                target: e.target,
                label: e.label || e.type || "REFERENCES",
              }));
              setExplorerData({
                name: graph.id || "Skill Graph",
                entities,
                connections,
                documents: [],
              });
              setScreen("explorer");
            }}
          />
        </div>
      </>
    );
  }

  // GitHub Repo analysis
  if (screen === "github_upload") {
    return (
      <>
        <div className="grid-bg" />
        <GitHubRepoScreen
          onGraphReady={(graphData) => {
            setExplorerData(graphData);
            setScreen("explorer");
          }}
          onBack={() => setScreen("mode_select")}
        />
      </>
    );
  }

  // Mode select
  if (screen === "mode_select") {
    return (
      <>
        <div className="grid-bg" />
        <ModeSelectScreen
          onSelectMode={(mode) => {
            if (mode === "document") setScreen("upload");
            else if (mode === "github") setScreen("github_upload");
            else setScreen("skill_upload");
          }}
          onBack={() => setScreen("projects")}
        />
      </>
    );
  }

  // Projects dashboard (default)
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
// Mode Select Screen
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
      subtitle: "Explore Connected Knowledge",
      desc: "Try a pre-built example knowledge graph instantly, or upload your own files. See how topics, concepts, and ideas connect across an interactive intelligence graph.",
      features: ["One-click example graph", "Interactive exploration", "Quality scoring & insights"],
      color: "#EE5A24",
    },
    {
      id: "github",
      icon: "\ud83d\udcbb",
      title: "Analyze GitHub Repo",
      subtitle: "Repo URL → Code Intelligence",
      desc: "Paste a GitHub repository URL. Xplor fetches the codebase structure, extracts files, dependencies, and relationships — then builds an interactive code graph.",
      features: ["Paste any public repo URL", "File structure mapping", "AI-powered code analysis"],
      color: "#4ECDC4",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", fontFamily: "'Outfit', system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "20px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onBack} style={{
          padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
          background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer",
        }}>← Back</button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: "rgba(255,255,255,0.95)", fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 4px" }}>Choose a Mode</h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.35)", margin: 0 }}>What kind of knowledge do you want to explore?</p>
        </div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ maxWidth: 1000, margin: "40px auto", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {modes.map((mode) => {
          const isH = hovered === mode.id;
          return (
            <button key={mode.id} onMouseEnter={() => setHovered(mode.id)} onMouseLeave={() => setHovered(null)} onClick={() => onSelectMode(mode.id)} style={{
              padding: 28, borderRadius: 16, textAlign: "left", cursor: "pointer", transition: "all 0.2s",
              display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Outfit', sans-serif",
              border: `1px solid ${isH ? mode.color + "40" : "rgba(255,255,255,0.06)"}`,
              background: isH ? mode.color + "0A" : "rgba(255,255,255,0.03)",
              transform: isH ? "translateY(-2px)" : "none",
            }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: mode.color + "18", border: `1px solid ${mode.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>{mode.icon}</div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: mode.color, fontFamily: "'Space Grotesk', sans-serif", margin: "0 0 4px" }}>{mode.title}</h3>
                <p style={{ fontSize: 11, fontWeight: 600, color: mode.color + "99", margin: 0 }}>{mode.subtitle}</p>
              </div>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.6 }}>{mode.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                {mode.features.map((f) => (
                  <li key={f} style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "flex", alignItems: "center" }}>
                    <span style={{ color: mode.color, marginRight: 6 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <div style={{
                padding: "11px 20px", borderRadius: 8, fontSize: 13, fontWeight: 700, textAlign: "center", marginTop: 4, transition: "all 0.2s",
                background: isH ? `linear-gradient(135deg, ${mode.color}, #4ECDC4)` : "transparent",
                border: isH ? "none" : `1px solid ${mode.color}40`,
                color: isH ? "#000" : mode.color,
              }}>
                {mode.id === "document" ? "Upload PDFs →" : mode.id === "github" ? "Paste Repo URL →" : "Try Example →"}
              </div>
            </button>
          );
        })}
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)", margin: 0, padding: "0 24px 40px" }}>
        All modes produce the same graph format — explore with the same Explorer UI.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GitHub Repo Analysis Screen
// ---------------------------------------------------------------------------

function GitHubRepoScreen({ onGraphReady, onBack }) {
  const [repoUrl, setRepoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState("");

  const analyzeRepo = async () => {
    const urlMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/\s?#]+)/);
    if (!urlMatch) {
      setError("Please paste a valid GitHub repository URL (e.g. https://github.com/user/repo)");
      return;
    }

    const [, owner, repo] = urlMatch;
    const repoName = repo.replace(/\.git$/, "");
    setLoading(true);
    setError(null);

    try {
      // Step 1: Fetch repo metadata
      setProgress("Fetching repository info…");
      const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
      if (!metaRes.ok) throw new Error(`Repository not found or is private (${metaRes.status})`);
      const meta = await metaRes.json();

      // Step 2: Fetch file tree
      setProgress("Scanning file tree…");
      const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees/${meta.default_branch}?recursive=1`);
      if (!treeRes.ok) throw new Error("Could not fetch file tree");
      const treeData = await treeRes.json();

      const files = (treeData.tree || []).filter((f) => f.type === "blob");
      const codeExts = [".js", ".ts", ".jsx", ".tsx", ".py", ".java", ".go", ".rs", ".rb", ".php", ".c", ".cpp", ".h", ".cs", ".swift", ".kt", ".vue", ".svelte"];
      const configFiles = ["package.json", "Cargo.toml", "go.mod", "requirements.txt", "Gemfile", "pom.xml", "build.gradle", "Makefile", "Dockerfile", "docker-compose.yml"];
      const docFiles = [".md", ".txt", ".rst"];

      const codeFiles = files.filter((f) => codeExts.some((ext) => f.path.endsWith(ext)));
      const configs = files.filter((f) => configFiles.some((name) => f.path.endsWith(name)));
      const docs = files.filter((f) => docFiles.some((ext) => f.path.endsWith(ext)));

      // Step 3: Fetch key files for AI analysis (README, package.json, etc.)
      setProgress("Reading key files…");
      const keyFiles = [...configs.slice(0, 5), ...docs.filter((f) => f.path.toLowerCase().includes("readme")).slice(0, 2)];
      const fileContents = [];

      for (const file of keyFiles) {
        try {
          const contentRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`);
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            if (contentData.content) {
              const decoded = atob(contentData.content);
              fileContents.push({ path: file.path, content: decoded.slice(0, 3000) });
            }
          }
        } catch { /* skip individual file errors */ }
      }

      // Step 4: Build graph from file structure
      setProgress("Building code graph…");

      // Extract directory structure as entities
      const dirs = new Set();
      files.forEach((f) => {
        const parts = f.path.split("/");
        for (let i = 1; i < parts.length; i++) {
          dirs.add(parts.slice(0, i).join("/"));
        }
      });

      const entities = [];
      const connections = [];
      let eid = 0;

      // Repo node
      entities.push({ id: `e${eid++}`, name: repoName, type: "organization", description: meta.description || `${owner}/${repoName} — ${meta.language || "unknown"} repository` });

      // Language/tech nodes
      if (meta.language) {
        entities.push({ id: `e${eid++}`, name: meta.language, type: "concept", description: `Primary language` });
        connections.push({ source: "e0", target: `e${eid - 1}`, label: "USES" });
      }

      // Top-level directory nodes
      const topDirs = [...dirs].filter((d) => !d.includes("/")).slice(0, 20);
      topDirs.forEach((dir) => {
        const fileCount = files.filter((f) => f.path.startsWith(dir + "/")).length;
        entities.push({ id: `e${eid++}`, name: dir + "/", type: "location", description: `${fileCount} files`, sources: [dir] });
        connections.push({ source: "e0", target: `e${eid - 1}`, label: "CONTAINS" });
      });

      // Key code files as entities (limit to important ones)
      const importantFiles = codeFiles
        .filter((f) => !f.path.includes("node_modules") && !f.path.includes(".min.") && !f.path.includes("dist/"))
        .slice(0, 40);
      importantFiles.forEach((f) => {
        const ext = f.path.split(".").pop();
        entities.push({ id: `e${eid++}`, name: f.path, type: "document", description: `${ext} file — ${(f.size / 1024).toFixed(1)}KB`, sources: [f.path] });
        // Connect to parent directory
        const parentDir = f.path.split("/").slice(0, -1).join("/");
        const parentEntity = entities.find((e) => e.name === parentDir + "/");
        if (parentEntity) connections.push({ source: parentEntity.id, target: `e${eid - 1}`, label: "CONTAINS" });
        else connections.push({ source: "e0", target: `e${eid - 1}`, label: "CONTAINS" });
      });

      // Parse dependencies from package.json / requirements.txt
      fileContents.forEach((fc) => {
        if (fc.path === "package.json") {
          try {
            const pkg = JSON.parse(fc.content);
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };
            Object.keys(deps).slice(0, 15).forEach((dep) => {
              entities.push({ id: `e${eid++}`, name: dep, type: "concept", description: `dependency: ${deps[dep]}` });
              connections.push({ source: "e0", target: `e${eid - 1}`, label: "DEPENDS_ON" });
            });
          } catch { /* skip parse errors */ }
        }
        if (fc.path === "requirements.txt") {
          fc.content.split("\n").filter(Boolean).slice(0, 15).forEach((line) => {
            const depName = line.split("==")[0].split(">=")[0].trim();
            if (depName && !depName.startsWith("#")) {
              entities.push({ id: `e${eid++}`, name: depName, type: "concept", description: "Python dependency" });
              connections.push({ source: "e0", target: `e${eid - 1}`, label: "DEPENDS_ON" });
            }
          });
        }
      });

      // Step 5: Send to AI for analysis
      setProgress("AI analyzing codebase…");
      let aiEntities = [];
      try {
        const aiRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: `You analyze GitHub repositories. Extract the most important architectural concepts, patterns, and components. Respond ONLY with a JSON array of objects with fields: name, type (one of: concept, person, organization, event), description. Maximum 12 items. No markdown, no backticks, just the JSON array.`,
            messages: [{ role: "user", content: `Repository: ${owner}/${repoName}\nDescription: ${meta.description || "none"}\nLanguage: ${meta.language || "unknown"}\nStars: ${meta.stargazers_count}\nFile count: ${files.length}\nCode files: ${codeFiles.length}\n\nKey files:\n${fileContents.map((f) => `--- ${f.path} ---\n${f.content.slice(0, 1500)}`).join("\n\n")}` }],
          }),
        });
        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const text = aiData.content?.[0]?.text || aiData.text || aiData.response || "";
          const cleaned = text.replace(/```json|```/g, "").trim();
          aiEntities = JSON.parse(cleaned);
        }
      } catch { /* AI analysis is optional */ }

      aiEntities.forEach((ae) => {
        entities.push({ id: `e${eid++}`, name: ae.name, type: ae.type || "concept", description: ae.description || "" });
        connections.push({ source: "e0", target: `e${eid - 1}`, label: "IMPLEMENTS" });
      });

      setProgress("Done!");

      onGraphReady({
        name: `${owner}/${repoName}`,
        entities,
        connections,
        documents: [{
          name: `${owner}/${repoName}`,
          textLength: files.reduce((a, f) => a + (f.size || 0), 0),
          entityCount: entities.length,
        }],
      });

    } catch (err) {
      console.error("Repo analysis error:", err);
      setError(err.message || "Failed to analyze repository");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0A0F",
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <button onClick={onBack} style={{
          padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
          background: "transparent", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer",
        }}>← Back</button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "linear-gradient(135deg, #4ECDC4, #22D3EE)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#000",
          }}>◆</div>
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.8)", display: "block" }}>Code Mode</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", display: "block" }}>GitHub Repo → Intelligence Graph</span>
          </div>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 600, margin: "60px auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💻</div>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "0 0 8px", fontFamily: "'Space Grotesk', sans-serif" }}>
            Analyze a GitHub Repository
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1.6 }}>
            Paste any public repository URL. Xplor will map the file structure, extract dependencies, and use AI to identify architectural patterns.
          </p>
        </div>

        {/* URL Input */}
        <div style={{
          background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 14, padding: 24,
        }}>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
            Repository URL
          </label>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => { setRepoUrl(e.target.value); setError(null); }}
            placeholder="https://github.com/username/repository"
            disabled={loading}
            onKeyDown={(e) => { if (e.key === "Enter" && repoUrl.trim()) analyzeRepo(); }}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 10,
              border: "1px solid rgba(78,205,196,0.2)", background: "rgba(0,0,0,0.3)",
              color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit",
              transition: "border-color 0.2s",
            }}
          />

          {error && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 8, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.2)", fontSize: 12, color: "#FF6B6B" }}>
              ⚠ {error}
            </div>
          )}

          {loading && progress && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#4ECDC4", fontWeight: 600, marginBottom: 8 }}>{progress}</div>
              <div style={{ width: "100%", height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: "60%", height: "100%", background: "linear-gradient(90deg, #4ECDC4, #22D3EE)", borderRadius: 2, animation: "shimmer 1.5s ease-in-out infinite" }} />
              </div>
              <style>{`@keyframes shimmer { 0% { width: 20%; } 50% { width: 80%; } 100% { width: 20%; } }`}</style>
            </div>
          )}

          <button
            onClick={analyzeRepo}
            disabled={loading || !repoUrl.trim()}
            style={{
              width: "100%", marginTop: 16, padding: "14px", borderRadius: 10,
              border: "none", fontSize: 14, fontWeight: 700, cursor: loading ? "wait" : "pointer",
              fontFamily: "inherit", transition: "all 0.2s",
              background: loading ? "rgba(78,205,196,0.15)" : "linear-gradient(135deg, #4ECDC4, #22D3EE)",
              color: loading ? "#4ECDC4" : "#000",
              opacity: !repoUrl.trim() ? 0.4 : 1,
            }}
          >
            {loading ? "Analyzing…" : "Analyze Repository →"}
          </button>
        </div>

        {/* Example repos */}
        <div style={{ marginTop: 24, textAlign: "center" }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", margin: "0 0 10px" }}>Try one of these:</p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              "https://github.com/amlitio/xplor-v2",
              "https://github.com/expressjs/express",
              "https://github.com/pallets/flask",
            ].map((url) => (
              <button
                key={url}
                onClick={() => setRepoUrl(url)}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.35)",
                  fontSize: 11, cursor: "pointer", fontFamily: "inherit",
                }}
              >{url.split("github.com/")[1]}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
