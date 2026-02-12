"use client";
import { useState, useRef, useCallback } from "react";

async function extractTextFromPDF(file) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item) => item.str).join(" ") + "\n\n";
        }
        resolve(fullText);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function chunkText(text, maxChars = 14000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
  return chunks;
}

async function extractEntitiesFromText(text, fileName) {
  const chunks = chunkText(text);
  let allEntities = [], allConnections = [];

  for (let i = 0; i < Math.min(chunks.length, 6); i++) {
    try {
      const response = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chunks[i], fileName, chunkIndex: i, totalChunks: Math.min(chunks.length, 6) }),
      });
      const data = await response.json();
      if (data.entities) allEntities.push(...data.entities);
      if (data.connections) allConnections.push(...data.connections);
    } catch (err) {
      console.warn(`Chunk ${i + 1} failed:`, err);
    }
  }

  const entityMap = new Map();
  allEntities.forEach((e) => {
    const key = e.name.toLowerCase().trim();
    if (!entityMap.has(key)) entityMap.set(key, { ...e, sources: [fileName] });
    else {
      const ex = entityMap.get(key);
      if (!ex.sources.includes(fileName)) ex.sources.push(fileName);
    }
  });
  return { entities: Array.from(entityMap.values()), connections: allConnections };
}

export default function UploadScreen({ onComplete }) {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileInput = (e) => {
    const selected = Array.from(e.target.files).filter((f) => f.type === "application/pdf");
    setFiles((prev) => [...prev, ...selected]);
  };

  const processFiles = async () => {
    if (!files.length) return;
    setProcessing(true);
    setError("");

    let allEntities = [], allConnections = [], docMeta = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress(`Extracting text from "${file.name}" (${i + 1}/${files.length})...`);
      try {
        const text = await extractTextFromPDF(file);
        if (!text.trim()) { setProgress(`"${file.name}" appears empty, skipping...`); continue; }

        setProgress(`Analyzing "${file.name}" with AI (${i + 1}/${files.length})...`);
        const { entities, connections } = await extractEntitiesFromText(text, file.name);
        docMeta.push({ name: file.name, textLength: text.length, entityCount: entities.length });

        entities.forEach((e) => {
          const existing = allEntities.find((x) => x.name.toLowerCase() === e.name.toLowerCase());
          if (existing) {
            if (e.sources) e.sources.forEach((s) => { if (!existing.sources.includes(s)) existing.sources.push(s); });
          } else allEntities.push(e);
        });

        connections.forEach((c) => {
          const src = allEntities.find((e) => e.id === c.source || e.name.toLowerCase() === (entities.find((x) => x.id === c.source)?.name || "").toLowerCase());
          const tgt = allEntities.find((e) => e.id === c.target || e.name.toLowerCase() === (entities.find((x) => x.id === c.target)?.name || "").toLowerCase());
          if (src && tgt) {
            const exists = allConnections.find((x) => (x.source === src.id && x.target === tgt.id) || (x.source === tgt.id && x.target === src.id));
            if (!exists) allConnections.push({ ...c, source: src.id, target: tgt.id });
          }
        });
      } catch (err) {
        console.error(err);
        setError(`Error processing "${file.name}": ${err.message}`);
      }
    }

    if (!allEntities.length) {
      setError("No entities could be extracted. Try different PDF files.");
      setProcessing(false);
      return;
    }

    setProcessing(false);
    setProgress("");
    onComplete({ entities: allEntities, connections: allConnections, documents: docMeta });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 640, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 11, letterSpacing: 4, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginBottom: 12 }}>New Analysis</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 12px", background: "linear-gradient(135deg, #FF6B6B, #4ECDC4, #45B7D1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Space Grotesk', sans-serif" }}>
          Upload PDFs
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", margin: "0 0 40px", lineHeight: 1.6 }}>
          AI will extract entities, relationships, and build an interactive knowledge graph.
        </p>

        <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => fileInputRef.current?.click()} style={{
          border: "2px dashed rgba(255,255,255,0.12)", borderRadius: 16, padding: "48px 32px",
          cursor: "pointer", background: "rgba(255,255,255,0.02)", marginBottom: 24, transition: "all 0.3s",
        }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📄</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", marginBottom: 4 }}>Drop PDF files here or click to browse</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Supports multiple files</div>
          <input ref={fileInputRef} type="file" accept=".pdf" multiple onChange={handleFileInput} style={{ display: "none" }} />
        </div>

        {files.length > 0 && (
          <div style={{ marginBottom: 24, textAlign: "left" }}>
            {files.map((f, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: "#fff", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {f.name}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>{(f.size / 1024).toFixed(0)} KB</span>
                {!processing && <button onClick={(e) => { e.stopPropagation(); setFiles((prev) => prev.filter((_, j) => j !== i)); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 16, padding: 0 }}>×</button>}
              </div>
            ))}
          </div>
        )}

        {error && <div style={{ color: "#FF6B6B", fontSize: 13, marginBottom: 16 }}>{error}</div>}
        {progress && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "#4ECDC4", marginBottom: 8 }}>{progress}</div>
            <div style={{ height: 3, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "linear-gradient(90deg, #4ECDC4, #45B7D1)", borderRadius: 2, animation: "loading 1.5s ease-in-out infinite", width: "40%" }} />
            </div>
          </div>
        )}

        <button onClick={processFiles} disabled={!files.length || processing} style={{
          padding: "14px 40px", borderRadius: 10, border: "none",
          background: files.length && !processing ? "linear-gradient(135deg, #FF6B6B, #4ECDC4)" : "rgba(255,255,255,0.08)",
          color: files.length && !processing ? "#000" : "rgba(255,255,255,0.3)",
          fontSize: 14, fontWeight: 700, cursor: files.length && !processing ? "pointer" : "default", transition: "all 0.3s",
        }}>
          {processing ? "Processing..." : `Analyze ${files.length} file${files.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
