"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import LandingPage from "@/components/LandingPage";
import AuthScreen from "@/components/AuthScreen";
import ProjectsDashboard from "@/components/ProjectsDashboard";
import UploadScreen from "@/components/UploadScreen";
import Explorer from "@/components/Explorer";

export default function Home() {
  const { user, loading } = useAuth();
  const [screen, setScreen] = useState("auto"); // auto | auth | projects | upload | explorer
  const [explorerData, setExplorerData] = useState(null);

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
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 900, color: "#000",
          }}>◆</div>
          Loading...
        </div>
      </div>
    );
  }

  // Landing page for visitors
  if (!user && screen === "auto") {
    return <LandingPage onEnterApp={() => setScreen("auth")} />;
  }

  // Auth screen
  if (!user) {
    return (
      <>
        <div className="grid-bg" />
        <AuthScreen onBack={() => setScreen("auto")} />
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

  // Projects dashboard
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
