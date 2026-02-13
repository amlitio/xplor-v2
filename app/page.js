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
  const [screen, setScreen] = useState("auto"); // auto | auth | secrets | projects | upload | explorer
  const [explorerData, setExplorerData] = useState(null);

  // Global callback so the hidden "Secrets" link in the footer can trigger navigation
  useEffect(() => {
    window.__showSecrets = () => setScreen("secrets");
    return () => { delete window.__showSecrets; };
  }, []);

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
          }}>◆</div>
          Loading...
        </div>
      </div>
    );
  }

  // Secrets page (accessible from hidden footer link)
  if (screen === "secrets") {
    return <SecretsPage onBack={() => setScreen(user ? "projects" : "auto")} />;
  }

  // Landing page for unauthenticated users who haven't clicked "Get Started"
  if (!user && screen === "auto") {
    return (
      <LandingPage onEnterApp={() => setScreen("auth")} />
    );
  }

  // Auth screen
  if (!user && screen === "auth") {
    return (
      <>
        <div className="grid-bg" />
        <AuthScreen />
      </>
    );
  }

  // Once logged in, redirect to projects if still on auto/auth
  if (user && (screen === "auto" || screen === "auth")) {
    if (screen !== "projects") {
      setTimeout(() => setScreen("projects"), 0);
    }
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
      />
    </>
  );
}