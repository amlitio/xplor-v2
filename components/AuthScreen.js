"use client";
import { useState } from "react";
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from "@/lib/firebase";

export default function AuthScreen({ onBack }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "").trim());
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      position: "relative",
      zIndex: 1,
    }}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        {/* Back to landing */}
        {onBack && (
          <div
            onClick={onBack}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 12, color: "rgba(255,255,255,0.35)", cursor: "pointer",
              marginBottom: 24, transition: "color 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#4ECDC4"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}
          >
            ← Back
          </div>
        )}

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#000", marginBottom: 16,
          }}>◆</div>
          <h1 style={{
            fontSize: 32, fontWeight: 800, margin: "0 0 8px",
            background: "linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontFamily: "'Space Grotesk', sans-serif",
          }}>PDF Explorer</h1>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Google Sign In */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: "100%", padding: "12px 16px", borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "#fff", fontSize: 13, fontWeight: 600,
            cursor: "pointer", marginBottom: 20, display: "flex",
            alignItems: "center", justifyContent: "center", gap: 10,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
          color: "rgba(255,255,255,0.2)", fontSize: 11,
        }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          or
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          )}
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={inputStyle}
          />

          {error && (
            <div style={{ color: "#FF6B6B", fontSize: 12, marginBottom: 12 }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 10,
              border: "none",
              background: loading ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, #FF6B6B, #4ECDC4)",
              color: loading ? "rgba(255,255,255,0.3)" : "#000",
              fontSize: 13, fontWeight: 700, cursor: loading ? "default" : "pointer",
              transition: "all 0.3s",
            }}
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
            style={{ color: "#4ECDC4", cursor: "pointer", fontWeight: 600 }}
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </span>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontSize: 13,
  outline: "none",
  marginBottom: 12,
};
