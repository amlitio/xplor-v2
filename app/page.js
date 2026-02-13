"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import LandingPage from "@/components/LandingPage";
import SecretsPage from "@/components/SecretsPage";
import AuthScreen from "@/components/AuthScreen";
import ProjectsDashboard from "@/components/ProjectsDashboard";
import UploadScreen from "@/components/UploadScreen";
import Explorer from "@/components/Explorer";

export default function Home() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState("auto");
  const [explorerData, setExplorerData] = useState(null);

  // Global callbacks for navigation from anywhere
  useEffect(() => {
    window.__showSecrets = () => setScreen("secrets");
    window.__showLanding = () => setScreen("auto");
    window.__showProjects = () => setScreen("projects");
    return () => {
      delete window.__showSecrets;
      delete window.__showLanding;
      delete window.__showProjects;
    };
  }, []);

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

  // Landing page for unauthenticated visitors
  if (!user && screen === "auto") {
    return <LandingPage onEnterApp={() => setScreen("auth")} />;
  }

  // Auth screen
  if (!user && (screen === "auth" || screen !== "auto")) {
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

  // Upload view
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

  // Projects dashboard (default for logged-in users)
  return (
    <>
      <div className="grid-bg" />
      <ProjectsDashboard
        onNewProject={() => setScreen("upload")}
        onOpenProject={(project) => {
          setExplorerData(project);
          setScreen("explorer");
        }}
        onGoHome={() => setScreen("auto")}
        onGoSecrets={() => setScreen("secrets")}
      />
    </>
  );
}