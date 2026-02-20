"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { saveProject, shareProject } from "@/lib/firebase";
import NetworkChat from "@/components/NetworkChat";

const TYPE_COLORS = {
  person: { bg: "#FF6B6B", glow: "rgba(255,107,107,0.4)" },
  organization: { bg: "#4ECDC4", glow: "rgba(78,205,196,0.4)" },
  location: { bg: "#45B7D1", glow: "rgba(69,183,209,0.4)" },
  concept: { bg: "#96CEB4", glow: "rgba(150,206,180,0.4)" },
  event: { bg: "#FFEAA7", glow: "rgba(255,234,167,0.4)" },
  document: { bg: "#DDA0DD", glow: "rgba(221,160,221,0.4)" },
};
const getColor = (type) => TYPE_COLORS[type] || { bg: "#A8A8A8", glow: "rgba(168,168,168,0.4)" };

// ─── Force Simulation Hook ───
function useForceSimulation(nodes, edges, width, height) {
  const [positions, setPositions] = useState({});
  const posRef = useRef({});
  const velRef = useRef({});
  const frameRef = useRef(null);
  const iterRef = useRef(0);

  useEffect(() => {
    if (!nodes.length || !width || !height) return;
    const pos = {}, vel = {};
    const cx = width / 2, cy = height / 2;
    nodes.forEach((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const r = Math.min(width, height) * 0.35;
      pos[n.id] = posRef.current[n.id] || {
        x: cx + r * Math.cos(angle) + (Math.random() - 0.5) * 60,
        y: cy + r * Math.sin(angle) + (Math.random() - 0.5) * 60,
      };
      vel[n.id] = { x: 0, y: 0 };
    });
    posRef.current = pos;
    velRef.current = vel;
    iterRef.current = 0;

    function tick() {
      const p = posRef.current, v = velRef.current;
      iterRef.current++;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i].id, b = nodes[j].id;
          const dx = p[a].x - p[b].x, dy = p[a].y - p[b].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 8000 / (dist * dist);
          v[a].x += (dx / dist) * force; v[a].y += (dy / dist) * force;
          v[b].x -= (dx / dist) * force; v[b].y -= (dy / dist) * force;
        }
      }
      edges.forEach((e) => {
        if (!p[e.source] || !p[e.target]) return;
        const dx = p[e.target].x - p[e.source].x, dy = p[e.target].y - p[e.source].y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * 0.004 * (e.strength || 1);
        v[e.source].x += (dx / dist) * force; v[e.source].y += (dy / dist) * force;
        v[e.target].x -= (dx / dist) * force; v[e.target].y -= (dy / dist) * force;
      });
      nodes.forEach((n) => {
        v[n.id].x += (cx - p[n.id].x) * 0.002;
        v[n.id].y += (cy - p[n.id].y) * 0.002;
        v[n.id].x *= 0.85; v[n.id].y *= 0.85;
        p[n.id].x += v[n.id].x; p[n.id].y += v[n.id].y;
        p[n.id].x = Math.max(60, Math.min(width - 60, p[n.id].x));
        p[n.id].y = Math.max(60, Math.min(height - 60, p[n.id].y));
      });
      setPositions({ ...p });
      if (iterRef.current < 300) frameRef.current = requestAnimationFrame(tick);
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [nodes, edges, width, height]);
  return positions;
}

// ─── Network Graph ───
function NetworkGraph({ entities, connections, onSelectEntity, selectedEntity, searchTerm }) {
  const containerRef = useRef(null);
  const [dim, setDim] = useState({ w: 900, h: 600 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, px: 0, py: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setDim({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = searchTerm
    ? entities.filter((e) => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.type.includes(searchTerm.toLowerCase()) || (e.description || "").toLowerCase().includes(searchTerm.toLowerCase()))
    : entities;
  const fIds = new Set(filtered.map((e) => e.id));
  const fConns = connections.filter((c) => fIds.has(c.source) && fIds.has(c.target));
  const positions = useForceSimulation(filtered, fConns, dim.w, dim.h);

  const connectedToSel = new Set();
  if (selectedEntity) fConns.forEach((c) => {
    if (c.source === selectedEntity.id) connectedToSel.add(c.target);
    if (c.target === selectedEntity.id) connectedToSel.add(c.source);
  });

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden", cursor: isPanning ? "grabbing" : "grab" }}
      onWheel={(e) => { e.preventDefault(); setZoom((z) => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001))); }}
      onMouseDown={(e) => { if (e.target.tagName === "circle" || e.target.tagName === "text") return; setIsPanning(true); panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; }}
      onMouseMove={(e) => { if (!isPanning) return; setPan({ x: panStart.current.px + (e.clientX - panStart.current.x), y: panStart.current.py + (e.clientY - panStart.current.y) }); }}
      onMouseUp={() => setIsPanning(false)} onMouseLeave={() => setIsPanning(false)}
    >
      <svg width={dim.w} height={dim.h} style={{ position: "absolute", top: 0, left: 0 }}>
        <defs>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="glowS"><feGaussianBlur stdDeviation="6" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
          {fConns.map((conn, i) => {
            const s = positions[conn.source], t = positions[conn.target];
            if (!s || !t) return null;
            const hl = selectedEntity && (conn.source === selectedEntity.id || conn.target === selectedEntity.id);
            const dimmed = selectedEntity && !hl;
            return (
              <g key={`e-${i}`}>
                <line x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke={hl ? "#FFD700" : hoveredEdge === i ? "#fff" : "rgba(255,255,255,0.12)"}
                  strokeWidth={hl ? 2.5 : hoveredEdge === i ? 2 : Math.max(0.5, (conn.strength || 1) * 0.5)}
                  opacity={dimmed ? 0.05 : 1} style={{ transition: "all 0.3s" }}
                  onMouseEnter={() => setHoveredEdge(i)} onMouseLeave={() => setHoveredEdge(null)} />
                {hoveredEdge === i && <text x={(s.x + t.x) / 2} y={(s.y + t.y) / 2 - 8} fill="#FFD700" fontSize="10" textAnchor="middle" style={{ pointerEvents: "none", fontFamily: "'JetBrains Mono',monospace" }}>{conn.relationship}</text>}
              </g>
            );
          })}
          {filtered.map((entity) => {
            const pos = positions[entity.id]; if (!pos) return null;
            const color = getColor(entity.type);
            const isSel = selectedEntity?.id === entity.id;
            const isConn = connectedToSel.has(entity.id);
            const isHov = hoveredNode === entity.id;
            const dimmed = selectedEntity && !isSel && !isConn;
            const cc = fConns.filter((c) => c.source === entity.id || c.target === entity.id).length;
            const r = Math.max(6, Math.min(18, 6 + cc * 1.5));
            return (
              <g key={entity.id} style={{ cursor: "pointer" }} opacity={dimmed ? 0.15 : 1}
                onClick={(e) => { e.stopPropagation(); onSelectEntity(isSel ? null : entity); }}
                onMouseEnter={() => setHoveredNode(entity.id)} onMouseLeave={() => setHoveredNode(null)}>
                {(isSel || isHov) && <circle cx={pos.x} cy={pos.y} r={r + 6} fill="none" stroke={color.bg} strokeWidth="2" opacity="0.5" filter="url(#glowS)" />}
                <circle cx={pos.x} cy={pos.y} r={isSel ? r + 3 : isHov ? r + 2 : r}
                  fill={color.bg} stroke={isSel ? "#fff" : "rgba(0,0,0,0.3)"} strokeWidth={isSel ? 2.5 : 1}
                  filter={isSel || isHov ? "url(#glow)" : "none"} />
                <text x={pos.x} y={pos.y + r + 14} textAnchor="middle"
                  fill={isSel ? "#fff" : isHov ? "#ddd" : "rgba(255,255,255,0.7)"}
                  fontSize={isSel ? "11" : "9.5"} fontWeight={isSel ? "700" : "500"}
                  style={{ pointerEvents: "none", fontFamily: "'JetBrains Mono',monospace", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}>
                  {entity.name.length > 22 ? entity.name.slice(0, 20) + "…" : entity.name}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", gap: 6, flexDirection: "column" }}>
        {[
          { label: "+", fn: () => setZoom((z) => Math.min(3, z + 0.2)) },
          { label: "⟲", fn: () => { setZoom(1); setPan({ x: 0, y: 0 }); } },
          { label: "−", fn: () => setZoom((z) => Math.max(0.3, z - 0.2)) },
        ].map((b) => (
          <button key={b.label} onClick={b.fn} style={{
            width: 32, height: 32, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6,
            background: "rgba(0,0,0,0.5)", color: "#fff", fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(8px)",
          }}>{b.label}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Entity Detail Panel ───
function EntityDetail({ entity, connections, entities, onSelectEntity }) {
  if (!entity) return null;
  const related = connections
    .filter((c) => c.source === entity.id || c.target === entity.id)
    .map((c) => ({ ...c, other: entities.find((e) => e.id === (c.source === entity.id ? c.target : c.source)) }))
    .filter((c) => c.other);
  const color = getColor(entity.type);

  return (
    <div style={{ padding: "20px 16px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: color.bg, boxShadow: `0 0 8px ${color.glow}`, flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{entity.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>{entity.type}</div>
        </div>
      </div>
      {entity.description && <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", lineHeight: 1.5, margin: "0 0 16px" }}>{entity.description}</p>}
      {entity.sources && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>Sources: {entity.sources.join(", ")}</div>}
      {related.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>
            Connections ({related.length})
          </div>
          {related.map((r, i) => (
            <div key={i} onClick={() => onSelectEntity(r.other)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "7px 10px",
              borderRadius: 6, background: "rgba(255,255,255,0.04)", cursor: "pointer",
              marginBottom: 4, transition: "background 0.2s",
            }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: getColor(r.other.type).bg, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.other.name}</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>{r.relationship}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Directory View ───
function DirectoryView({ entities, connections, onSelectEntity, selectedEntity, searchTerm }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("connections");
  const types = [...new Set(entities.map((e) => e.type))];
  let filtered = searchTerm
    ? entities.filter((e) => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || (e.description || "").toLowerCase().includes(searchTerm.toLowerCase()))
    : entities;
  if (typeFilter !== "all") filtered = filtered.filter((e) => e.type === typeFilter);
  const withCounts = filtered.map((e) => ({ ...e, cc: connections.filter((c) => c.source === e.id || c.target === e.id).length }));
  if (sortBy === "connections") withCounts.sort((a, b) => b.cc - a.cc);
  else withCounts.sort((a, b) => a.name.localeCompare(b.name));

  const selStyle = { padding: "6px 12px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 12, outline: "none" };

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selStyle}>
          <option value="all">All Types</option>
          {types.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}s</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selStyle}>
          <option value="connections">Most Connected</option>
          <option value="name">Alphabetical</option>
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "rgba(255,255,255,0.4)", alignSelf: "center" }}>{withCounts.length} entities</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        {withCounts.map((entity) => {
          const color = getColor(entity.type);
          const isSel = selectedEntity?.id === entity.id;
          return (
            <div key={entity.id} onClick={() => onSelectEntity(isSel ? null : entity)} style={{
              padding: 16, borderRadius: 10, cursor: "pointer", transition: "all 0.2s",
              background: isSel ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
              border: isSel ? `1px solid ${color.bg}` : "1px solid rgba(255,255,255,0.06)",
            }}
              onMouseEnter={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={(e) => { if (!isSel) e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `linear-gradient(135deg, ${color.bg}, ${color.bg}88)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#000", flexShrink: 0 }}>
                  {entity.name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entity.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{entity.type}</div>
                </div>
              </div>
              {entity.description && <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.45, margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{entity.description}</p>}
              <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>🔗 {entity.cc}</span>
                {entity.sources && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>📄 {entity.sources.length}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Dashboard ───
function DashboardView({ entities, connections, documents }) {
  const typeCounts = {};
  entities.forEach((e) => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
  const topConnected = entities.map((e) => ({ ...e, count: connections.filter((c) => c.source === e.id || c.target === e.id).length })).sort((a, b) => b.count - a.count).slice(0, 8);

  return (
    <div style={{ padding: 24, overflowY: "auto", height: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { l: "Entities", v: entities.length, c: "#FF6B6B" },
          { l: "Connections", v: connections.length, c: "#4ECDC4" },
          { l: "Documents", v: documents.length, c: "#45B7D1" },
          { l: "Types", v: Object.keys(typeCounts).length, c: "#FFEAA7" },
        ].map((s) => (
          <div key={s.l} style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>By Type</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(typeCounts).map(([type, count]) => (
            <div key={type} style={{ padding: "8px 14px", borderRadius: 20, background: `${getColor(type).bg}22`, border: `1px solid ${getColor(type).bg}44`, fontSize: 12, color: getColor(type).bg }}>{type}: {count}</div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Most Connected</div>
        {topConnected.map((e, i) => (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", width: 20 }}>#{i + 1}</span>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: getColor(e.type).bg }} />
            <span style={{ fontSize: 13, flex: 1 }}>{e.name}</span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{e.count} links</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Explorer ───
export default function Explorer({ data, onBack }) {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState("network");
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!data.id);
  const [shareUrl, setShareUrl] = useState("");
  const [projectName, setProjectName] = useState(data.name || "");
  const [showNameInput, setShowNameInput] = useState(!data.name);

  const { entities, connections, documents } = data;
  const navItems = [
    { id: "dashboard", icon: "◉", label: "Dashboard" },
    { id: "network", icon: "◎", label: "Network" },
    { id: "directory", icon: "☷", label: "Directory" },
    { id: "documents", icon: "☰", label: "Documents" },
  ];
  const legend = Object.entries(TYPE_COLORS).map(([type, color]) => {
    const count = entities.filter((e) => e.type === type).length;
    if (!count) return null;
    return (
      <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: color.bg }} />
        <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", textTransform: "capitalize" }}>{type} ({count})</span>
      </div>
    );
  });

  const handleSave = async () => {
    if (!user || !projectName.trim()) { setShowNameInput(true); return; }
    setSaving(true);
    try {
      const projectId = await saveProject(user.uid, {
        id: data.id || undefined,
        name: projectName.trim(),
        entities,
        connections,
        documents,
        entityCount: entities.length,
        connectionCount: connections.length,
        documentCount: documents.length,
        documentNames: documents.map((d) => d.name),
      });
      data.id = projectId;
      setSaved(true);
      setShowNameInput(false);
    } catch (err) {
      console.error("Save failed:", err);
    }
    setSaving(false);
  };

  const handleShare = async () => {
    if (!user || !data.id) { await handleSave(); }
    try {
      const shareId = await shareProject(user.uid, data.id);
      const url = `${window.location.origin}/shared/${shareId}`;
      setShareUrl(url);
      navigator.clipboard?.writeText(url);
    } catch (err) {
      console.error("Share failed:", err);
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: sidebarCollapsed ? 56 : 200, background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", transition: "width 0.3s ease", flexShrink: 0, overflow: "hidden" }}>
        <div onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ padding: sidebarCollapsed ? "16px 8px" : "16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #FF6B6B, #4ECDC4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "#000", flexShrink: 0 }}>◆</div>
          {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "'Space Grotesk', sans-serif" }}>File Xplor</span>}
        </div>
        <nav style={{ padding: "12px 8px", flex: 1 }}>
          {navItems.map((item) => (
            <div key={item.id} onClick={() => setActiveView(item.id)} style={{
              display: "flex", alignItems: "center", gap: 10, padding: sidebarCollapsed ? "10px 0" : "10px 12px",
              borderRadius: 8, cursor: "pointer", marginBottom: 2, justifyContent: sidebarCollapsed ? "center" : "flex-start",
              background: activeView === item.id ? "rgba(255,255,255,0.08)" : "transparent",
              color: activeView === item.id ? "#fff" : "rgba(255,255,255,0.4)", fontSize: 12, transition: "all 0.2s",
            }}
              onMouseEnter={(e) => { if (activeView !== item.id) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (activeView !== item.id) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              {!sidebarCollapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div onClick={onBack} style={{
            display: "flex", alignItems: "center", gap: 10, padding: sidebarCollapsed ? "10px 0" : "10px 12px",
            borderRadius: 8, cursor: "pointer", color: "rgba(255,255,255,0.35)", fontSize: 11,
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
          }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#4ECDC4"}
            onMouseLeave={(e) => e.currentTarget.style.color = "rgba(255,255,255,0.35)"}>
            <span style={{ fontSize: 14 }}>←</span>
            {!sidebarCollapsed && <span>All Projects</span>}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top Bar */}
        <div style={{ padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 360 }}>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search entities..." style={{
              width: "100%", padding: "8px 12px 8px 32px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
              color: "#fff", fontSize: 12, outline: "none",
            }} />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "rgba(255,255,255,0.25)" }}>⌕</span>
          </div>

          <div style={{ display: "flex", gap: 12, marginLeft: "auto", alignItems: "center" }}>
            {legend}
          </div>

          {/* Save / Share buttons */}
          <div style={{ display: "flex", gap: 8, marginLeft: 12 }}>
            {showNameInput && (
              <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="Project name..." style={{
                padding: "6px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 12, outline: "none", width: 160,
              }} onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }} />
            )}
            <button onClick={handleSave} disabled={saving} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: saved ? "rgba(78,205,196,0.15)" : "rgba(255,255,255,0.08)",
              color: saved ? "#4ECDC4" : "#fff",
            }}>
              {saving ? "Saving..." : saved ? "✓ Saved" : "Save"}
            </button>
            <button onClick={handleShare} style={{
              padding: "6px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)",
              background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 11, cursor: "pointer",
            }}>Share</button>
          </div>
        </div>

        {shareUrl && (
          <div style={{ padding: "8px 20px", background: "rgba(78,205,196,0.08)", borderBottom: "1px solid rgba(78,205,196,0.15)", display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
            <span style={{ color: "#4ECDC4" }}>Link copied!</span>
            <code style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>{shareUrl}</code>
            <button onClick={() => setShareUrl("")} style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer" }}>×</button>
          </div>
        )}

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
            {activeView === "network" && <NetworkGraph entities={entities} connections={connections} onSelectEntity={setSelectedEntity} selectedEntity={selectedEntity} searchTerm={searchTerm} />}
            {activeView === "directory" && <DirectoryView entities={entities} connections={connections} onSelectEntity={setSelectedEntity} selectedEntity={selectedEntity} searchTerm={searchTerm} />}
            {activeView === "documents" && (
              <div style={{ padding: 24 }}>
                {documents.map((doc, i) => (
                  <div key={i} style={{ padding: 16, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>📄 {doc.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{(doc.textLength / 1000).toFixed(1)}K chars · {doc.entityCount} entities</div>
                  </div>
                ))}
              </div>
            )}
            {activeView === "dashboard" && <DashboardView entities={entities} connections={connections} documents={documents} />}
          </div>

          {selectedEntity && (
            <div style={{ width: 280, background: "rgba(255,255,255,0.02)", borderLeft: "1px solid rgba(255,255,255,0.06)", overflowY: "auto", flexShrink: 0 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 1.5 }}>Detail</span>
                <button onClick={() => setSelectedEntity(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
              <EntityDetail entity={selectedEntity} connections={connections} entities={entities} onSelectEntity={setSelectedEntity} />
            </div>
          )}
        </div>
      </div>

      {/* AI Chat */}
      <NetworkChat
        entities={entities}
        connections={connections}
        documents={documents}
        selectedEntity={selectedEntity}
        isPro={true}
      />
    </div>
  );
}
