"use client";
import { useState, useRef, useEffect } from "react";

export default function NetworkChat({ entities, connections, documents, selectedEntity, isPro = false }) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (expanded && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [expanded]);

  // Build context summary for AI
  const buildContext = () => {
    const entitySummary = entities.slice(0, 40).map(e => 
      `- ${e.name} (${e.type}): ${e.description || "no description"}${e.sources ? ` [from: ${e.sources.join(", ")}]` : ""}`
    ).join("\n");

    const connSummary = connections.slice(0, 50).map(c => {
      const src = entities.find(e => e.id === c.source);
      const tgt = entities.find(e => e.id === c.target);
      return src && tgt ? `- ${src.name} → ${tgt.name}: ${c.relationship} (strength: ${c.strength || "?"})` : null;
    }).filter(Boolean).join("\n");

    const docSummary = documents.map(d => 
      `- ${d.name} (${(d.textLength / 1000).toFixed(1)}K chars, ${d.entityCount} entities extracted)`
    ).join("\n");

    const selectedCtx = selectedEntity 
      ? `\n\nThe user currently has selected: "${selectedEntity.name}" (${selectedEntity.type}) - ${selectedEntity.description || "no description"}`
      : "";

    return `You are an AI analyst helping the user understand their document knowledge graph. You have access to the following extracted data:

DOCUMENTS ANALYZED (${documents.length}):
${docSummary}

KEY ENTITIES (${entities.length} total, showing top ${Math.min(40, entities.length)}):
${entitySummary}

RELATIONSHIPS (${connections.length} total, showing top ${Math.min(50, connections.length)}):
${connSummary}
${selectedCtx}

Help the user understand patterns, correlations, KPIs, findings, predictions, and hidden insights in their documents. Be specific — reference actual entity names and relationships. When discussing findings, cite which documents they come from. Be concise but insightful. If asked about something not in the data, say so clearly.`;
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!isPro) {
      setShowUpgrade(true);
      return;
    }

    const userMsg = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: buildContext(),
          messages: [...messages, { role: "user", text: userMsg }].map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        text: "Sorry, I encountered an error analyzing your documents. Please try again.",
        error: true,
      }]);
    }
    setLoading(false);
  };

  const quickPrompts = [
    "What are the key findings across all documents?",
    "Which entities are most connected and why?",
    "What patterns or anomalies do you see?",
    selectedEntity ? `Tell me everything about "${selectedEntity.name}"` : "Summarize the relationships in this graph",
  ];

  // Collapsed bar
  if (!expanded) {
    return (
      <div
        onClick={() => setExpanded(true)}
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 48, zIndex: 20,
          background: "linear-gradient(180deg, rgba(6,6,11,0.7), rgba(6,6,11,0.95))",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 12,
          cursor: "pointer", transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderTopColor = "rgba(34,211,238,0.2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderTopColor = "rgba(255,255,255,0.06)"; }}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(167,139,250,0.15))",
          border: "1px solid rgba(34,211,238,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13,
        }}>💬</div>
        <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
          Ask AI about your documents...
        </span>
        {!isPro && (
          <span style={{
            fontSize: 9, padding: "3px 8px", borderRadius: 10,
            background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
            color: "#000", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5,
          }}>PRO</span>
        )}
        <span style={{
          marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.2)",
        }}>▲</span>
      </div>
    );
  }

  // Expanded panel
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      height: "45%", minHeight: 280, maxHeight: 420,
      zIndex: 20,
      background: "rgba(6,6,11,0.97)",
      backdropFilter: "blur(24px)",
      borderTop: "1px solid rgba(34,211,238,0.15)",
      display: "flex", flexDirection: "column",
      transition: "height 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        display: "flex", alignItems: "center", gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6,
          background: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(167,139,250,0.2))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11,
        }}>💬</div>
        <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
          Document Intelligence
        </span>
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>
          {entities.length} entities · {connections.length} connections · {documents.length} docs
        </span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            marginLeft: "auto", background: "none", border: "none",
            color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 14,
            padding: "4px 8px",
          }}
        >▼</button>
      </div>

      {/* Upgrade overlay */}
      {showUpgrade && !isPro && (
        <div style={{
          position: "absolute", inset: 0, zIndex: 30,
          background: "rgba(6,6,11,0.95)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: 32, textAlign: "center",
        }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🔮</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
            Document Intelligence is a Pro feature
          </h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 20px", maxWidth: 360, lineHeight: 1.6 }}>
            Chat with AI about your knowledge graph — ask about patterns, correlations, KPIs, predictions, and hidden insights across all your documents.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{
              padding: "10px 24px", borderRadius: 8, border: "none",
              background: "linear-gradient(135deg, #22D3EE, #A78BFA)",
              color: "#000", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Upgrade to Pro — $19/mo</button>
            <button onClick={() => { setShowUpgrade(false); setExpanded(false); }} style={{
              padding: "10px 16px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.4)",
              fontSize: 12, cursor: "pointer",
            }}>Maybe later</button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "12px 16px",
        display: "flex", flexDirection: "column", gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", margin: "0 0 16px" }}>
              Ask anything about your documents, entities, and connections.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => { setInput(prompt); }}
                  style={{
                    padding: "6px 12px", borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.45)", fontSize: 11,
                    cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.2s", maxWidth: 280,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.2)"; e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "85%", padding: "10px 14px", borderRadius: 12,
              background: msg.role === "user"
                ? "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(167,139,250,0.12))"
                : msg.error
                  ? "rgba(255,107,107,0.08)"
                  : "rgba(255,255,255,0.04)",
              border: msg.role === "user"
                ? "1px solid rgba(34,211,238,0.15)"
                : msg.error
                  ? "1px solid rgba(255,107,107,0.15)"
                  : "1px solid rgba(255,255,255,0.05)",
              borderTopRightRadius: msg.role === "user" ? 4 : 12,
              borderTopLeftRadius: msg.role === "user" ? 12 : 4,
            }}>
              <div style={{
                fontSize: 12.5, color: msg.error ? "rgba(255,107,107,0.7)" : "rgba(255,255,255,0.7)",
                lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.text}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "4px 0" }}>
            <div style={{
              display: "flex", gap: 4,
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: "#22D3EE",
                  animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  opacity: 0.5,
                }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>Analyzing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: "10px 16px 14px",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", gap: 8, alignItems: "center",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 12, padding: "4px 4px 4px 14px",
          transition: "border-color 0.2s",
        }}>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={selectedEntity ? `Ask about "${selectedEntity.name}" or anything else...` : "Ask about your documents, patterns, predictions..."}
            style={{
              flex: 1, background: "none", border: "none",
              color: "#fff", fontSize: 12.5, outline: "none",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: "none",
              background: input.trim() && !loading
                ? "linear-gradient(135deg, #22D3EE, #A78BFA)"
                : "rgba(255,255,255,0.05)",
              color: input.trim() && !loading ? "#000" : "rgba(255,255,255,0.2)",
              fontSize: 14, cursor: input.trim() && !loading ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
            }}
          >
            ↑
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
